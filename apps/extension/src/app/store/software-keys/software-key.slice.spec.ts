import { resetWallet } from '@leather.io/state';
import { userRemovesWallet } from '@leather.io/state/wallet';

import { type PlatformUnlockConfig, encodeBase64Url } from '@shared/crypto/platform-unlock';

import { initialKeysState, keySlice } from './software-key.slice';

function bytes(length: number, seed: number) {
  return encodeBase64Url(new Uint8Array(length).fill(seed));
}

function makePlatformUnlockConfig(seed = 1): PlatformUnlockConfig {
  return {
    version: 1,
    credentialId: bytes(32, seed),
    prfInput: bytes(32, 2),
    registrationTag: bytes(16, 3),
    iv: bytes(12, 4),
    wrappedEncryptionKey: bytes(64, 5),
  };
}

function makeKey(id: string) {
  return { type: 'software' as const, id, encryptedSecretKey: `enc-${id}` };
}

const { reducer, actions } = keySlice;

function passwordProfile() {
  return reducer(
    initialKeysState,
    actions.createSoftwareWalletComplete({ salt: 'salt', key: makeKey('aaaa1111') })
  );
}

function biometricProfile(platformUnlock = makePlatformUnlockConfig()) {
  return reducer(
    initialKeysState,
    actions.createBiometricSoftwareWalletComplete({ platformUnlock, key: makeKey('aaaa1111') })
  );
}

describe('software key slice', () => {
  test('creating a password wallet records the password mode and salt', () => {
    const state = passwordProfile();
    expect(state.authenticationMode).toBe('password');
    expect(state.salt).toBe('salt');
    expect(state.platformUnlock).toBeUndefined();
    expect(state.ids).toEqual(['aaaa1111']);
  });

  test('creating a biometric wallet records the platform unlock config and no salt', () => {
    const platformUnlock = makePlatformUnlockConfig();
    const state = reducer(
      { ...initialKeysState, salt: 'stale-salt' },
      actions.createBiometricSoftwareWalletComplete({ platformUnlock, key: makeKey('aaaa1111') })
    );
    expect(state.authenticationMode).toBe('biometric-only');
    expect(state.platformUnlock).toEqual(platformUnlock);
    expect(state.salt).toBeUndefined();
    expect(state.ids).toEqual(['aaaa1111']);
  });

  test('adds a second biometric wallet only with the same platform unlock config', () => {
    const platformUnlock = makePlatformUnlockConfig();
    const state = biometricProfile(platformUnlock);

    const added = reducer(
      state,
      actions.createBiometricSoftwareWalletComplete({ platformUnlock, key: makeKey('bbbb2222') })
    );
    expect(added.ids).toEqual(['aaaa1111', 'bbbb2222']);

    const rejected = reducer(
      state,
      actions.createBiometricSoftwareWalletComplete({
        platformUnlock: makePlatformUnlockConfig(9),
        key: makeKey('bbbb2222'),
      })
    );
    expect(rejected).toEqual(state);
  });

  test('never adds a biometric wallet to a password profile', () => {
    const state = passwordProfile();
    const next = reducer(
      state,
      actions.createBiometricSoftwareWalletComplete({
        platformUnlock: makePlatformUnlockConfig(),
        key: makeKey('bbbb2222'),
      })
    );
    expect(next).toEqual(state);
  });

  test('never adds a password wallet or re-encrypted key to a biometric profile', () => {
    const state = biometricProfile();
    expect(
      reducer(
        state,
        actions.createSoftwareWalletComplete({ salt: 'salt', key: makeKey('bbbb2222') })
      )
    ).toEqual(state);
    expect(
      reducer(state, actions.softwareKeyReEncrypted({ salt: 'salt', key: makeKey('aaaa1111') }))
    ).toEqual(state);
  });

  test('removing the last software wallet clears the unlock method', () => {
    const state = reducer(biometricProfile(), userRemovesWallet({ fingerprint: 'aaaa1111' }));
    expect(state.ids).toEqual([]);
    expect(state.authenticationMode).toBeUndefined();
    expect(state.platformUnlock).toBeUndefined();
    expect(state.salt).toBeUndefined();
  });

  test('removing one of several wallets keeps the unlock method', () => {
    const platformUnlock = makePlatformUnlockConfig();
    const withTwo = reducer(
      biometricProfile(platformUnlock),
      actions.createBiometricSoftwareWalletComplete({ platformUnlock, key: makeKey('bbbb2222') })
    );
    const state = reducer(withTwo, userRemovesWallet({ fingerprint: 'aaaa1111' }));
    expect(state.ids).toEqual(['bbbb2222']);
    expect(state.authenticationMode).toBe('biometric-only');
    expect(state.platformUnlock).toEqual(platformUnlock);
  });

  test('resetting clears the unlock method', () => {
    for (const state of [biometricProfile(), passwordProfile()]) {
      const next = reducer(state, resetWallet());
      expect(next.ids).toEqual([]);
      expect(next.authenticationMode).toBeUndefined();
      expect(next.platformUnlock).toBeUndefined();
      expect(next.salt).toBeUndefined();
    }
  });
});
