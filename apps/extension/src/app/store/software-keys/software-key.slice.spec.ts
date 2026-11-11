import { resetWallet } from '@leather.io/state';
import { userRemovesWallet } from '@leather.io/state/wallet';

import { encodeBase64Url } from '@shared/crypto/platform-unlock';

import { initialKeysState, keySlice } from './software-key.slice';

const platformUnlock = {
  version: 1 as const,
  credentialId: encodeBase64Url(new Uint8Array(32).fill(1)),
  prfInput: encodeBase64Url(new Uint8Array(32).fill(2)),
  registrationTag: encodeBase64Url(new Uint8Array(9).fill(3)),
  iv: encodeBase64Url(new Uint8Array(12).fill(4)),
  wrappedEncryptionKey: encodeBase64Url(new Uint8Array(64).fill(5)),
};

function makeKey(id: string) {
  return { type: 'software' as const, id, encryptedSecretKey: `encrypted-${id}` };
}

const reducer = keySlice.reducer;

function createBiometricState() {
  return reducer(
    initialKeysState,
    keySlice.actions.createBiometricSoftwareWalletComplete({
      platformUnlock,
      key: makeKey('aaaa1111'),
    })
  );
}

describe('software key slice', () => {
  test('a password wallet sets password mode with its salt', () => {
    const state = reducer(
      initialKeysState,
      keySlice.actions.createSoftwareWalletComplete({ salt: 'salt', key: makeKey('aaaa1111') })
    );
    expect(state.authenticationMode).toBe('password');
    expect(state.salt).toBe('salt');
    expect(state.platformUnlock).toBeUndefined();
  });

  test('a biometric wallet sets biometric-only mode without a salt', () => {
    const state = createBiometricState();
    expect(state.ids).toEqual(['aaaa1111']);
    expect(state.authenticationMode).toBe('biometric-only');
    expect(state.platformUnlock).toEqual(platformUnlock);
    expect(state).not.toHaveProperty('salt');
  });

  test('adding a biometric wallet keeps the unlock method', () => {
    const state = reducer(
      createBiometricState(),
      keySlice.actions.biometricSoftwareWalletAdded(makeKey('bbbb2222'))
    );
    expect(state.ids).toEqual(['aaaa1111', 'bbbb2222']);
    expect(state.authenticationMode).toBe('biometric-only');
    expect(state.platformUnlock).toEqual(platformUnlock);
  });

  test('removing a wallet keeps the unlock method while software wallets remain', () => {
    const withTwo = reducer(
      createBiometricState(),
      keySlice.actions.biometricSoftwareWalletAdded(makeKey('bbbb2222'))
    );
    const state = reducer(withTwo, userRemovesWallet({ fingerprint: 'aaaa1111' }));
    expect(state.ids).toEqual(['bbbb2222']);
    expect(state.authenticationMode).toBe('biometric-only');
  });

  test('removing the last software wallet clears the unlock method', () => {
    const state = reducer(createBiometricState(), userRemovesWallet({ fingerprint: 'aaaa1111' }));
    expect(state.ids).toEqual([]);
    expect(state).not.toHaveProperty('authenticationMode');
    expect(state).not.toHaveProperty('platformUnlock');

    const passwordState = reducer(
      reducer(
        initialKeysState,
        keySlice.actions.createSoftwareWalletComplete({ salt: 'salt', key: makeKey('aaaa1111') })
      ),
      userRemovesWallet({ fingerprint: 'aaaa1111' })
    );
    expect(passwordState).not.toHaveProperty('salt');
    expect(passwordState).not.toHaveProperty('authenticationMode');
  });

  test('resetting clears keys and the unlock method', () => {
    const state = reducer(createBiometricState(), resetWallet());
    expect(state.ids).toEqual([]);
    expect(state).not.toHaveProperty('authenticationMode');
    expect(state).not.toHaveProperty('platformUnlock');
    expect(state).not.toHaveProperty('salt');
  });
});
