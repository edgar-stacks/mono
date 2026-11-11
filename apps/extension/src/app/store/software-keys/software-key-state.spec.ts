import { encodeBase64Url } from '@shared/crypto/platform-unlock';

import { parseSoftwareKeyAuthentication } from './software-key-state';

const platformUnlock = {
  version: 1,
  credentialId: encodeBase64Url(new Uint8Array(32).fill(1)),
  prfInput: encodeBase64Url(new Uint8Array(32).fill(2)),
  registrationTag: encodeBase64Url(new Uint8Array(9).fill(3)),
  iv: encodeBase64Url(new Uint8Array(12).fill(4)),
  wrappedEncryptionKey: encodeBase64Url(new Uint8Array(64).fill(5)),
};

const key = { type: 'software', id: 'abcd1234', encryptedSecretKey: 'encrypted' };
const keys = { ids: [key.id], entities: { [key.id]: key } };

describe(parseSoftwareKeyAuthentication.name, () => {
  test('treats an empty profile as having no unlock method', () => {
    expect(parseSoftwareKeyAuthentication({ ids: [], entities: {} })).toEqual({ mode: 'none' });
    expect(parseSoftwareKeyAuthentication({ ids: [], entities: {}, salt: 'salt' })).toEqual({
      mode: 'none',
    });
  });

  test('treats keys without a mode as a legacy password profile', () => {
    expect(parseSoftwareKeyAuthentication({ ...keys, salt: 'salt' })).toEqual({
      mode: 'password',
      salt: 'salt',
    });
    expect(parseSoftwareKeyAuthentication(keys)).toEqual({ mode: 'password', salt: undefined });
  });

  test('accepts an explicit password profile with a salt', () => {
    expect(
      parseSoftwareKeyAuthentication({ ...keys, salt: 'salt', authenticationMode: 'password' })
    ).toEqual({ mode: 'password', salt: 'salt' });
  });

  test('accepts a biometric-only profile with a valid config and no salt', () => {
    expect(
      parseSoftwareKeyAuthentication({
        ...keys,
        authenticationMode: 'biometric-only',
        platformUnlock,
      })
    ).toEqual({ mode: 'biometric-only', platformUnlock });
  });

  test('rejects mixed or incomplete modes', () => {
    expect(
      parseSoftwareKeyAuthentication({
        ...keys,
        authenticationMode: 'biometric-only',
        platformUnlock,
        salt: 'salt',
      })
    ).toBeNull();
    expect(
      parseSoftwareKeyAuthentication({ ...keys, authenticationMode: 'biometric-only' })
    ).toBeNull();
    expect(
      parseSoftwareKeyAuthentication({
        ...keys,
        authenticationMode: 'password',
        salt: 'salt',
        platformUnlock,
      })
    ).toBeNull();
    expect(parseSoftwareKeyAuthentication({ ...keys, platformUnlock })).toBeNull();
    expect(parseSoftwareKeyAuthentication({ ...keys, authenticationMode: 'password' })).toBeNull();
    expect(
      parseSoftwareKeyAuthentication({
        ids: [],
        entities: {},
        authenticationMode: 'biometric-only',
        platformUnlock,
      })
    ).toBeNull();
  });

  test('rejects a malformed config or key state', () => {
    expect(
      parseSoftwareKeyAuthentication({
        ...keys,
        authenticationMode: 'biometric-only',
        platformUnlock: { ...platformUnlock, iv: `${platformUnlock.iv}=` },
      })
    ).toBeNull();
    expect(
      parseSoftwareKeyAuthentication({ ...keys, authenticationMode: 'pin', salt: 'salt' })
    ).toBeNull();
    expect(parseSoftwareKeyAuthentication({ ids: ['missing'], entities: {} })).toBeNull();
    expect(parseSoftwareKeyAuthentication(undefined)).toBeNull();
  });
});
