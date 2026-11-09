import { type PlatformUnlockConfig, encodeBase64Url } from '@shared/crypto/platform-unlock';

import {
  hasBiometricAuthenticationState,
  readPersistedSoftwareKeys,
  resolveSoftwareKeyAuthentication,
} from './software-key-state';

function bytes(length: number, seed: number) {
  return encodeBase64Url(new Uint8Array(length).fill(seed));
}

const platformUnlock: PlatformUnlockConfig = {
  version: 1,
  credentialId: bytes(32, 1),
  prfInput: bytes(32, 2),
  registrationTag: bytes(16, 3),
  iv: bytes(12, 4),
  wrappedEncryptionKey: bytes(64, 5),
};

const key = { type: 'software', id: 'aaaa1111', encryptedSecretKey: 'enc' };
const keys = { ids: ['aaaa1111'], entities: { aaaa1111: key } };
const expectedKeys = [{ id: 'aaaa1111', encryptedSecretKey: 'enc' }];

describe(resolveSoftwareKeyAuthentication.name, () => {
  test('resolves no keys to none, whatever stale fields remain', () => {
    expect(resolveSoftwareKeyAuthentication(undefined)).toEqual({ mode: 'none' });
    expect(resolveSoftwareKeyAuthentication({ ids: [], entities: {}, salt: 'salt' })).toEqual({
      mode: 'none',
    });
  });

  test('resolves an explicit password profile', () => {
    expect(
      resolveSoftwareKeyAuthentication({ ...keys, authenticationMode: 'password', salt: 'salt' })
    ).toEqual({ mode: 'password', keys: expectedKeys, salt: 'salt' });
  });

  test('resolves keys without a mode as a legacy password profile', () => {
    expect(resolveSoftwareKeyAuthentication({ ...keys, salt: 'salt' })).toEqual({
      mode: 'password',
      keys: expectedKeys,
      salt: 'salt',
    });
    expect(resolveSoftwareKeyAuthentication(keys)).toEqual({
      mode: 'password',
      keys: expectedKeys,
      salt: undefined,
    });
  });

  test('resolves a biometric-only profile', () => {
    expect(
      resolveSoftwareKeyAuthentication({
        ...keys,
        authenticationMode: 'biometric-only',
        platformUnlock,
      })
    ).toEqual({ mode: 'biometric-only', keys: expectedKeys, platformUnlock });
  });

  test.each([
    [
      'biometric-only with a salt',
      { authenticationMode: 'biometric-only', platformUnlock, salt: 'salt' },
    ],
    ['biometric-only without a config', { authenticationMode: 'biometric-only' }],
    [
      'biometric-only with a malformed config',
      { authenticationMode: 'biometric-only', platformUnlock: { ...platformUnlock, iv: 'AQ==' } },
    ],
    [
      'password with a platform unlock config',
      { authenticationMode: 'password', salt: 'salt', platformUnlock },
    ],
    ['password without a salt', { authenticationMode: 'password' }],
    ['a legacy profile with a platform unlock config', { salt: 'salt', platformUnlock }],
    ['an unknown mode', { authenticationMode: 'passkey', salt: 'salt' }],
  ])('rejects %s', (_label, fields) => {
    expect(resolveSoftwareKeyAuthentication({ ...keys, ...fields })).toEqual({ mode: 'invalid' });
  });

  test('rejects ids and entities that disagree', () => {
    expect(
      resolveSoftwareKeyAuthentication({
        ids: ['aaaa1111', 'bbbb2222'],
        entities: { aaaa1111: key },
      })
    ).toEqual({ mode: 'invalid' });
    expect(
      resolveSoftwareKeyAuthentication({
        ids: ['aaaa1111'],
        entities: { aaaa1111: key, bbbb2222: { ...key, id: 'bbbb2222' } },
      })
    ).toEqual({ mode: 'invalid' });
    expect(resolveSoftwareKeyAuthentication('nope')).toEqual({ mode: 'invalid' });
  });
});

describe(hasBiometricAuthenticationState.name, () => {
  test('detects biometric fields', () => {
    expect(hasBiometricAuthenticationState({ authenticationMode: 'biometric-only' })).toBe(true);
    expect(hasBiometricAuthenticationState({ platformUnlock })).toBe(true);
    expect(hasBiometricAuthenticationState({ salt: 'salt' })).toBe(false);
    expect(hasBiometricAuthenticationState(undefined)).toBe(false);
  });
});

describe(readPersistedSoftwareKeys.name, () => {
  test('reads the software keys slice from the persisted root', () => {
    expect(readPersistedSoftwareKeys({ softwareKeys: keys })).toEqual(keys);
    expect(readPersistedSoftwareKeys(null)).toBeUndefined();
  });
});
