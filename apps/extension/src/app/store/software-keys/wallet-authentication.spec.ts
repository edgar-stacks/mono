import { describe, expect, test, vi } from 'vitest';

import { encodeBase64Url } from '@shared/crypto/platform-unlock';

import {
  assertNoPersistedSoftwareKeys,
  assertPersistedSoftwareKeysMatch,
  enrollPlatformUnlock,
  getBiometricPlatformUnlock,
  isSameSoftwareKeysState,
  unlockPlatformEncryptionKey,
} from './wallet-authentication';

const credentialId = encodeBase64Url(new Uint8Array(32).fill(8));
const prfOutput = new Uint8Array(32).fill(1);

function createFakeAuthenticator({
  createPrfOutput = prfOutput,
  assertionPrfOutput = prfOutput,
}: {
  createPrfOutput?: Uint8Array<ArrayBuffer> | null;
  assertionPrfOutput?: Uint8Array<ArrayBuffer>;
} = {}) {
  return {
    createCredential: vi.fn(() => Promise.resolve({ credentialId, prfOutput: createPrfOutput })),
    getPrfOutput: vi.fn(() => Promise.resolve(assertionPrfOutput)),
  };
}

async function enrollTestProfile() {
  const { encryptionKey, platformUnlock } = await enrollPlatformUnlock(createFakeAuthenticator());
  const key = { type: 'software', id: 'abcd1234', encryptedSecretKey: 'encrypted' };
  const softwareKeys = {
    ids: [key.id],
    entities: { [key.id]: key },
    authenticationMode: 'biometric-only',
    platformUnlock,
  };
  return { encryptionKey, platformUnlock, softwareKeys };
}

function persistSoftwareKeys(softwareKeys: unknown) {
  return chrome.storage.local.set({ 'persist:root': { softwareKeys } });
}

describe(enrollPlatformUnlock.name, () => {
  test('wraps a fresh random key with the PRF output from registration', async () => {
    const authenticator = createFakeAuthenticator();
    const { encryptionKey, platformUnlock } = await enrollPlatformUnlock(authenticator);

    expect(encryptionKey).toMatch(/^[0-9a-f]{96}$/);
    expect(platformUnlock.credentialId).toBe(credentialId);
    expect(authenticator.getPrfOutput).not.toHaveBeenCalled();
    await expect(unlockPlatformEncryptionKey(platformUnlock, authenticator)).resolves.toBe(
      encryptionKey
    );
  });

  test('asks for an assertion when registration returns no PRF output', async () => {
    const authenticator = createFakeAuthenticator({ createPrfOutput: null });
    const { platformUnlock } = await enrollPlatformUnlock(authenticator);

    expect(authenticator.getPrfOutput).toHaveBeenCalledWith({
      credentialId,
      prfInput: platformUnlock.prfInput,
    });
  });
});

describe(unlockPlatformEncryptionKey.name, () => {
  test('fails with credential-mismatch for a different PRF output', async () => {
    const { platformUnlock } = await enrollTestProfile();
    await expect(
      unlockPlatformEncryptionKey(
        platformUnlock,
        createFakeAuthenticator({ assertionPrfOutput: new Uint8Array(32).fill(2) })
      )
    ).rejects.toMatchObject({ category: 'credential-mismatch' });
  });

  test('fails with invalid-config for a malformed config', async () => {
    const { platformUnlock } = await enrollTestProfile();
    const authenticator = createFakeAuthenticator();
    await expect(
      unlockPlatformEncryptionKey({ ...platformUnlock, iv: 'not canonical' }, authenticator)
    ).rejects.toMatchObject({ category: 'invalid-config' });
    expect(authenticator.getPrfOutput).not.toHaveBeenCalled();
  });
});

describe(getBiometricPlatformUnlock.name, () => {
  test('returns the config of a biometric-only profile', async () => {
    const { platformUnlock, softwareKeys } = await enrollTestProfile();
    expect(getBiometricPlatformUnlock(softwareKeys)).toEqual(platformUnlock);
  });

  test('rejects a password profile or a mixed profile', async () => {
    const { softwareKeys } = await enrollTestProfile();
    expect(() =>
      getBiometricPlatformUnlock({ ...softwareKeys, authenticationMode: 'password' })
    ).toThrow();
    expect(() => getBiometricPlatformUnlock({ ...softwareKeys, salt: 'salt' })).toThrow();
  });
});

describe('persisted state validation', () => {
  test('matches when the persisted keys equal the in-memory keys', async () => {
    const { softwareKeys } = await enrollTestProfile();
    await persistSoftwareKeys(softwareKeys);
    await expect(assertPersistedSoftwareKeysMatch(softwareKeys)).resolves.toBeUndefined();
  });

  test('rejects missing, stale or invalid persisted keys', async () => {
    const { softwareKeys } = await enrollTestProfile();
    await expect(assertPersistedSoftwareKeysMatch(softwareKeys)).rejects.toMatchObject({
      category: 'wallet-validation',
    });

    await persistSoftwareKeys({
      ...softwareKeys,
      entities: { abcd1234: { ...softwareKeys.entities.abcd1234, encryptedSecretKey: 'other' } },
    });
    await expect(assertPersistedSoftwareKeysMatch(softwareKeys)).rejects.toMatchObject({
      category: 'wallet-validation',
    });

    await persistSoftwareKeys({ ...softwareKeys, salt: 'salt' });
    await expect(assertPersistedSoftwareKeysMatch(softwareKeys)).rejects.toMatchObject({
      category: 'wallet-validation',
    });
  });

  test('compares unlock config and keys', async () => {
    const first = await enrollTestProfile();
    const second = await enrollTestProfile();
    expect(isSameSoftwareKeysState(first.softwareKeys, first.softwareKeys)).toBe(true);
    expect(isSameSoftwareKeysState(first.softwareKeys, second.softwareKeys)).toBe(false);
  });

  test('allows a first wallet only when nothing is persisted', async () => {
    await expect(assertNoPersistedSoftwareKeys()).resolves.toBeUndefined();
    await persistSoftwareKeys({ ids: [], entities: {} });
    await expect(assertNoPersistedSoftwareKeys()).resolves.toBeUndefined();

    const { softwareKeys } = await enrollTestProfile();
    await persistSoftwareKeys(softwareKeys);
    await expect(assertNoPersistedSoftwareKeys()).rejects.toMatchObject({
      category: 'wallet-validation',
    });
  });
});
