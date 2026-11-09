import {
  type PlatformUnlockConfig,
  encodeBase64Url,
  generatePlatformUnlockRegistration,
  generateWalletEncryptionKey,
  wrapWalletEncryptionKey,
} from '@shared/crypto/platform-unlock';

import {
  isPersistedBiometricProfile,
  isPersistedProfileEmpty,
  parsePersistedSoftwareKeysState,
  resolveSoftwareKeyAuthentication,
} from './software-key-state';

let platformUnlock: PlatformUnlockConfig;

beforeAll(async () => {
  platformUnlock = await wrapWalletEncryptionKey({
    encryptionKey: generateWalletEncryptionKey(),
    prfOutput: new Uint8Array(32).fill(1),
    credentialId: encodeBase64Url(new Uint8Array([1, 2, 3, 4])),
    ...generatePlatformUnlockRegistration(),
  });
});

const keys = [{ id: 'aaaa', encryptedSecretKey: 'encrypted-aaaa' }];

function makePersistedRoot(softwareKeys: Record<string, unknown>) {
  return {
    softwareKeys: {
      ids: ['aaaa'],
      entities: { aaaa: { type: 'software', ...keys[0] } },
      ...softwareKeys,
    },
  };
}

describe(resolveSoftwareKeyAuthentication.name, () => {
  test('an empty profile has no unlock method', () => {
    expect(resolveSoftwareKeyAuthentication({ ids: [] }).mode).toBe('none');
    expect(resolveSoftwareKeyAuthentication({ ids: [], salt: 'stale' }).mode).toBe('none');
  });

  test('an empty profile with a leftover unlock method is invalid', () => {
    expect(resolveSoftwareKeyAuthentication({ ids: [], authenticationMode: 'password' }).mode).toBe(
      'invalid'
    );
    expect(resolveSoftwareKeyAuthentication({ ids: [], platformUnlock }).mode).toBe('invalid');
  });

  test('keys without a mode are a legacy password profile', () => {
    expect(resolveSoftwareKeyAuthentication({ ids: ['aaaa'], salt: 'salt' })).toEqual({
      mode: 'password',
      salt: 'salt',
    });
    expect(resolveSoftwareKeyAuthentication({ ids: ['aaaa'] })).toEqual({ mode: 'password' });
  });

  test('legacy profiles cannot carry a platform unlock config', () => {
    expect(resolveSoftwareKeyAuthentication({ ids: ['aaaa'], platformUnlock }).mode).toBe(
      'invalid'
    );
  });

  test('password mode keeps a salt and no platform unlock config', () => {
    expect(
      resolveSoftwareKeyAuthentication({
        ids: ['aaaa'],
        authenticationMode: 'password',
        salt: 'salt',
      }).mode
    ).toBe('password');
    expect(
      resolveSoftwareKeyAuthentication({ ids: ['aaaa'], authenticationMode: 'password' }).mode
    ).toBe('invalid');
    expect(
      resolveSoftwareKeyAuthentication({
        ids: ['aaaa'],
        authenticationMode: 'password',
        salt: 'salt',
        platformUnlock,
      }).mode
    ).toBe('invalid');
  });

  test('biometric-only mode keeps a valid platform unlock config and no salt', () => {
    expect(
      resolveSoftwareKeyAuthentication({
        ids: ['aaaa'],
        authenticationMode: 'biometric-only',
        platformUnlock,
      })
    ).toEqual({ mode: 'biometric-only', platformUnlock });
    expect(
      resolveSoftwareKeyAuthentication({
        ids: ['aaaa'],
        authenticationMode: 'biometric-only',
        platformUnlock,
        salt: 'salt',
      }).mode
    ).toBe('invalid');
    expect(
      resolveSoftwareKeyAuthentication({ ids: ['aaaa'], authenticationMode: 'biometric-only' }).mode
    ).toBe('invalid');
    expect(
      resolveSoftwareKeyAuthentication({
        ids: ['aaaa'],
        authenticationMode: 'biometric-only',
        platformUnlock: { ...platformUnlock, iv: `${platformUnlock.iv}=` },
      }).mode
    ).toBe('invalid');
  });

  test('an unknown mode is invalid', () => {
    expect(
      resolveSoftwareKeyAuthentication({ ids: ['aaaa'], authenticationMode: 'pin' }).mode
    ).toBe('invalid');
  });
});

describe(parsePersistedSoftwareKeysState.name, () => {
  test('reads the software keys slice from the persisted root', () => {
    expect(
      parsePersistedSoftwareKeysState(
        makePersistedRoot({ authenticationMode: 'biometric-only', platformUnlock })
      )
    ).toEqual({
      ids: ['aaaa'],
      keys,
      salt: undefined,
      authenticationMode: 'biometric-only',
      platformUnlock,
    });
  });

  test('treats a missing slice as empty', () => {
    expect(parsePersistedSoftwareKeysState({})).toEqual({ ids: [], keys: [] });
  });

  test('rejects malformed roots and entities', () => {
    expect(parsePersistedSoftwareKeysState(null)).toBeNull();
    expect(parsePersistedSoftwareKeysState({ softwareKeys: 'x' })).toBeNull();
    expect(
      parsePersistedSoftwareKeysState({ softwareKeys: { ids: ['aaaa'], entities: {} } })
    ).toBeNull();
    expect(
      parsePersistedSoftwareKeysState({
        softwareKeys: { ids: ['aaaa'], entities: { aaaa: { id: 'bbbb', encryptedSecretKey: '' } } },
      })
    ).toBeNull();
  });
});

describe(isPersistedBiometricProfile.name, () => {
  test('matches when the persisted profile has the same config and keys', () => {
    const persisted = parsePersistedSoftwareKeysState(
      makePersistedRoot({ authenticationMode: 'biometric-only', platformUnlock })
    );
    expect(isPersistedBiometricProfile({ persisted, platformUnlock, keys })).toBe(true);
  });

  test('rejects a stale config, other keys, a password profile or a missing root', () => {
    const persisted = parsePersistedSoftwareKeysState(
      makePersistedRoot({ authenticationMode: 'biometric-only', platformUnlock })
    );
    expect(
      isPersistedBiometricProfile({
        persisted,
        platformUnlock: { ...platformUnlock, credentialId: 'AQID' },
        keys,
      })
    ).toBe(false);
    expect(
      isPersistedBiometricProfile({
        persisted,
        platformUnlock,
        keys: [{ id: 'aaaa', encryptedSecretKey: 'other' }],
      })
    ).toBe(false);
    expect(
      isPersistedBiometricProfile({
        persisted: parsePersistedSoftwareKeysState(makePersistedRoot({ salt: 'salt' })),
        platformUnlock,
        keys,
      })
    ).toBe(false);
    expect(isPersistedBiometricProfile({ persisted: null, platformUnlock, keys })).toBe(false);
  });
});

describe(isPersistedProfileEmpty.name, () => {
  test('is true only for a readable profile without software keys', () => {
    expect(isPersistedProfileEmpty(parsePersistedSoftwareKeysState({}))).toBe(true);
    expect(isPersistedProfileEmpty(parsePersistedSoftwareKeysState(makePersistedRoot({})))).toBe(
      false
    );
    expect(isPersistedProfileEmpty(null)).toBe(false);
  });
});
