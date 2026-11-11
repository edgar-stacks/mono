import { beforeEach, describe, expect, test, vi } from 'vitest';

import { restoreWalletSession } from './session-restore';

const mocks = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = { _persist: { version: 4, rehydrated: false } };
  return {
    listeners,
    state,
    store: {
      getState: vi.fn(() => state),
      subscribe: vi.fn((listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
    },
    selectSoftwareKeys: vi.fn(),
    decryptMnemonic: vi.fn(),
    setKey: vi.fn(),
  };
});

vi.mock('@app/store/store', () => ({ store: mocks.store }));

vi.mock('@app/store/software-keys/software-key.selectors', () => ({
  selectSoftwareKeys: mocks.selectSoftwareKeys,
}));

vi.mock('@stacks/encryption', () => ({ decryptMnemonic: mocks.decryptMnemonic }));

vi.mock('./in-memory-key/in-memory-storage', () => ({ setKey: mocks.setKey }));

const encryptionKey = 'session-encryption-key';
const fingerprint = 'abc123';
const encryptedSecretKey = 'encrypted-secret-key';
const decryptedSecretKey = 'decrypted-secret-key';

function rehydrateStore() {
  mocks.state._persist.rehydrated = true;
  mocks.listeners.forEach(listener => listener());
}

async function flushPromises() {
  for (let tick = 0; tick < 5; tick++) await new Promise(resolve => setTimeout(resolve, 0));
}

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.listeners.clear();
  mocks.state._persist.rehydrated = false;
  mocks.selectSoftwareKeys.mockReturnValue([{ id: fingerprint, encryptedSecretKey }]);
  mocks.decryptMnemonic.mockResolvedValue(decryptedSecretKey);
  await chrome.storage.session.set({ encryptionKey });
});

describe(restoreWalletSession.name, () => {
  test('waits for the store to rehydrate before restoring keys', async () => {
    const restored = restoreWalletSession();
    await flushPromises();

    expect(mocks.setKey).not.toHaveBeenCalled();
    expect(mocks.selectSoftwareKeys).not.toHaveBeenCalled();

    rehydrateStore();
    await restored;

    expect(mocks.decryptMnemonic).toHaveBeenCalledWith(encryptedSecretKey, encryptionKey);
    expect(mocks.setKey).toHaveBeenCalledWith(fingerprint, decryptedSecretKey);
    expect(mocks.listeners.size).toBe(0);
  });

  test('restores keys at once when the store is already rehydrated', async () => {
    mocks.state._persist.rehydrated = true;

    await restoreWalletSession();

    expect(mocks.store.subscribe).not.toHaveBeenCalled();
    expect(mocks.setKey).toHaveBeenCalledWith(fingerprint, decryptedSecretKey);
  });

  test('returns without waiting when there is no session key', async () => {
    await chrome.storage.session.remove('encryptionKey');

    await restoreWalletSession();

    expect(mocks.store.subscribe).not.toHaveBeenCalled();
    expect(mocks.selectSoftwareKeys).not.toHaveBeenCalled();
    expect(mocks.setKey).not.toHaveBeenCalled();
  });
});
