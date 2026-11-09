import { decryptMnemonic } from '@stacks/encryption';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { selectSoftwareKeys } from '@app/store/software-keys/software-key.selectors';

import { setKey } from './in-memory-key/in-memory-storage';
import { restoreWalletSession } from './session-restore';

const fakeStore = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let rehydrated = false;
  return {
    listeners,
    setRehydrated(value: boolean) {
      rehydrated = value;
      listeners.forEach(listener => listener());
    },
    reset(value: boolean) {
      rehydrated = value;
      listeners.clear();
    },
    getState() {
      return { _persist: { version: -1, rehydrated } };
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock('@app/store/store', () => ({
  store: { getState: fakeStore.getState, subscribe: fakeStore.subscribe },
}));

vi.mock('@app/store/software-keys/software-key.selectors', () => ({
  selectSoftwareKeys: vi.fn(),
}));

vi.mock('@stacks/encryption', () => ({
  decryptMnemonic: vi.fn(),
}));

vi.mock('./in-memory-key/in-memory-storage', () => ({
  setKey: vi.fn(),
}));

const sessionGet = vi.fn();

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.stubGlobal('chrome', { storage: { session: { get: sessionGet } } });
  sessionGet.mockResolvedValue({ encryptionKey: 'session-key' });
  vi.mocked(selectSoftwareKeys).mockReturnValue([
    { type: 'software', id: 'fp1', encryptedSecretKey: 'encrypted-secret' },
  ]);
  vi.mocked(decryptMnemonic).mockResolvedValue('decrypted-secret');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('restoreWalletSession', () => {
  test('waits for the store to rehydrate before restoring keys', async () => {
    fakeStore.reset(false);

    const restore = restoreWalletSession();
    await flushPromises();

    expect(setKey).not.toHaveBeenCalled();
    expect(selectSoftwareKeys).not.toHaveBeenCalled();

    fakeStore.setRehydrated(true);
    await restore;

    expect(decryptMnemonic).toHaveBeenCalledWith('encrypted-secret', 'session-key');
    expect(setKey).toHaveBeenCalledWith('fp1', 'decrypted-secret');
    expect(fakeStore.listeners.size).toBe(0);
  });

  test('restores keys at once when the store has already rehydrated', async () => {
    fakeStore.reset(true);

    await restoreWalletSession();

    expect(setKey).toHaveBeenCalledWith('fp1', 'decrypted-secret');
    expect(fakeStore.listeners.size).toBe(0);
  });

  test('returns without waiting when there is no session key', async () => {
    fakeStore.reset(false);
    sessionGet.mockResolvedValue({});

    await restoreWalletSession();

    expect(fakeStore.listeners.size).toBe(0);
    expect(selectSoftwareKeys).not.toHaveBeenCalled();
    expect(setKey).not.toHaveBeenCalled();
  });
});
