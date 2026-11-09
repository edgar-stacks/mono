import { beforeEach, describe, expect, test, vi } from 'vitest';

import { restoreWalletSession } from './session-restore';

const encryptionKey = 'session-encryption-key';
const fingerprint = 'fingerprint-1';
const encryptedSecretKey = 'encrypted-secret-key';
const decryptedSecretKey = 'decrypted-secret-key';

const mocks = vi.hoisted(() => {
  let state = { _persist: { rehydrated: false, version: 4 } };
  const listeners = new Set<() => void>();
  return {
    store: {
      getState() {
        return state;
      },
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    setRehydrated(rehydrated: boolean) {
      state = { ...state, _persist: { rehydrated, version: 4 } };
      for (const listener of [...listeners]) listener();
    },
    listenerCount() {
      return listeners.size;
    },
    reset() {
      state = { _persist: { rehydrated: false, version: 4 } };
      listeners.clear();
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

async function flushAsync() {
  for (let tick = 0; tick < 5; tick++) await new Promise(resolve => setTimeout(resolve, 0));
}

describe(restoreWalletSession.name, () => {
  beforeEach(() => {
    mocks.reset();
    mocks.selectSoftwareKeys.mockReset();
    mocks.decryptMnemonic.mockReset();
    mocks.setKey.mockReset();
    mocks.selectSoftwareKeys.mockReturnValue([{ id: fingerprint, encryptedSecretKey }]);
    mocks.decryptMnemonic.mockResolvedValue(decryptedSecretKey);
  });

  test('waits for the store to rehydrate before restoring keys', async () => {
    await chrome.storage.session.set({ encryptionKey });

    const restore = restoreWalletSession();
    await flushAsync();

    expect(mocks.selectSoftwareKeys).not.toHaveBeenCalled();
    expect(mocks.setKey).not.toHaveBeenCalled();

    mocks.setRehydrated(true);
    await restore;

    expect(mocks.decryptMnemonic).toHaveBeenCalledWith(encryptedSecretKey, encryptionKey);
    expect(mocks.setKey).toHaveBeenCalledWith(fingerprint, decryptedSecretKey);
    expect(mocks.listenerCount()).toBe(0);
  });

  test('restores keys at once when the store is already rehydrated', async () => {
    await chrome.storage.session.set({ encryptionKey });
    mocks.setRehydrated(true);

    await restoreWalletSession();

    expect(mocks.setKey).toHaveBeenCalledWith(fingerprint, decryptedSecretKey);
    expect(mocks.listenerCount()).toBe(0);
  });

  test('returns without waiting when there is no session key', async () => {
    await restoreWalletSession();

    expect(mocks.listenerCount()).toBe(0);
    expect(mocks.selectSoftwareKeys).not.toHaveBeenCalled();
    expect(mocks.setKey).not.toHaveBeenCalled();
  });
});
