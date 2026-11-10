import { beforeEach, describe, expect, test, vi } from 'vitest';

import { restoreWalletSession } from './session-restore';

const mocks = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = { _persist: { version: -1, rehydrated: false } };
  return {
    listeners,
    state,
    store: {
      getState() {
        return state;
      },
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
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

const sessionKey = 'session-encryption-key';
const fingerprint = 'abcd1234';
const encryptedSecretKey = 'encrypted-secret-key';
const decryptedSecretKey = 'decrypted-secret-key';

function rehydrateStore() {
  mocks.state._persist.rehydrated = true;
  mocks.listeners.forEach(listener => listener());
}

describe(restoreWalletSession.name, () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.listeners.clear();
    mocks.state._persist.rehydrated = false;
    mocks.selectSoftwareKeys.mockImplementation(() =>
      mocks.state._persist.rehydrated ? [{ id: fingerprint, encryptedSecretKey }] : []
    );
    mocks.decryptMnemonic.mockResolvedValue(decryptedSecretKey);
    await chrome.storage.session.set({ encryptionKey: sessionKey });
  });

  test('waits for the store to rehydrate before restoring keys', async () => {
    const restore = restoreWalletSession();
    await vi.waitFor(() => expect(mocks.listeners.size).toBe(1));

    expect(mocks.setKey).not.toHaveBeenCalled();

    rehydrateStore();
    await restore;

    expect(mocks.decryptMnemonic).toHaveBeenCalledWith(encryptedSecretKey, sessionKey);
    expect(mocks.setKey).toHaveBeenCalledWith(fingerprint, decryptedSecretKey);
    expect(mocks.listeners.size).toBe(0);
  });

  test('restores keys at once when the store is already rehydrated', async () => {
    mocks.state._persist.rehydrated = true;

    await restoreWalletSession();

    expect(mocks.listeners.size).toBe(0);
    expect(mocks.setKey).toHaveBeenCalledWith(fingerprint, decryptedSecretKey);
  });

  test('returns without waiting when there is no session key', async () => {
    await chrome.storage.session.remove('encryptionKey');

    await restoreWalletSession();

    expect(mocks.listeners.size).toBe(0);
    expect(mocks.selectSoftwareKeys).not.toHaveBeenCalled();
    expect(mocks.setKey).not.toHaveBeenCalled();
  });
});
