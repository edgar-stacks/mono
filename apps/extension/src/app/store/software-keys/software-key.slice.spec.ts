import { resetWallet } from '@leather.io/state';
import { userRemovesWallet } from '@leather.io/state/wallet';

import type { PlatformUnlockConfig } from '@shared/crypto/platform-unlock';

import { initialKeysState, keySlice } from './software-key.slice';

const platformUnlock: PlatformUnlockConfig = {
  version: 1,
  credentialId: 'AQIDBAUGBwg',
  prfInput: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  registrationTag: 'AAAAAAAAAAAA',
  iv: 'AAAAAAAAAAAAAAAA',
  wrappedEncryptionKey:
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

function makeKey(id: string) {
  return { type: 'software' as const, id, encryptedSecretKey: `encrypted-${id}` };
}

const { reducer, actions } = keySlice;

function createBiometricProfile() {
  return reducer(
    initialKeysState,
    actions.createBiometricWalletComplete({ platformUnlock, key: makeKey('aaaa') })
  );
}

describe('software key slice', () => {
  test('creating a password wallet stores the salt and password mode', () => {
    const state = reducer(
      initialKeysState,
      actions.createSoftwareWalletComplete({ salt: 'salt', key: makeKey('aaaa') })
    );
    expect(state.salt).toBe('salt');
    expect(state.authenticationMode).toBe('password');
    expect(state.platformUnlock).toBeUndefined();
    expect(state.ids).toEqual(['aaaa']);
  });

  test('creating a biometric wallet stores the platform unlock config and no salt', () => {
    const state = createBiometricProfile();
    expect(state.salt).toBeUndefined();
    expect(state.authenticationMode).toBe('biometric-only');
    expect(state.platformUnlock).toEqual(platformUnlock);
    expect(state.entities.aaaa).toEqual(makeKey('aaaa'));
  });

  test('adding a wallet keeps the biometric unlock method', () => {
    const state = reducer(createBiometricProfile(), actions.addNewWallet(makeKey('bbbb')));
    expect(state.ids).toEqual(['aaaa', 'bbbb']);
    expect(state.authenticationMode).toBe('biometric-only');
    expect(state.platformUnlock).toEqual(platformUnlock);
  });

  test('re-encrypting a legacy key records password mode', () => {
    const state = reducer(
      initialKeysState,
      actions.softwareKeyReEncrypted({ salt: 'salt', key: makeKey('aaaa') })
    );
    expect(state.salt).toBe('salt');
    expect(state.authenticationMode).toBe('password');
  });

  test('removing a wallet keeps the unlock method while software wallets remain', () => {
    const withTwo = reducer(createBiometricProfile(), actions.addNewWallet(makeKey('bbbb')));
    const state = reducer(withTwo, userRemovesWallet({ fingerprint: 'aaaa' }));
    expect(state.ids).toEqual(['bbbb']);
    expect(state.authenticationMode).toBe('biometric-only');
    expect(state.platformUnlock).toEqual(platformUnlock);
  });

  test('removing the last software wallet clears the unlock method', () => {
    const state = reducer(createBiometricProfile(), userRemovesWallet({ fingerprint: 'aaaa' }));
    expect(state.ids).toEqual([]);
    expect(state.authenticationMode).toBeUndefined();
    expect(state.platformUnlock).toBeUndefined();
    expect(state.salt).toBeUndefined();
  });

  test('removing the last password wallet clears the salt', () => {
    const passwordState = reducer(
      initialKeysState,
      actions.createSoftwareWalletComplete({ salt: 'salt', key: makeKey('aaaa') })
    );
    const state = reducer(passwordState, userRemovesWallet({ fingerprint: 'aaaa' }));
    expect(state.salt).toBeUndefined();
    expect(state.authenticationMode).toBeUndefined();
  });

  test('resetting clears the unlock method', () => {
    const state = reducer(createBiometricProfile(), resetWallet());
    expect(state.ids).toEqual([]);
    expect(state.authenticationMode).toBeUndefined();
    expect(state.platformUnlock).toBeUndefined();
    expect(state.salt).toBeUndefined();
  });
});
