import { bytesToHex } from '@stacks/common';
import { decryptMnemonic, encryptMnemonic } from '@stacks/encryption';

import { generateMnemonic, getMnemonicRootKeyFingerprint } from '@leather.io/crypto';
import { userAddsWallet } from '@leather.io/state/wallet';

import * as platformAuthenticator from '@shared/crypto/platform-authenticator';
import {
  type PlatformUnlockConfig,
  encodeBase64Url,
  generatePlatformUnlockRegistration,
  generateWalletEncryptionKey,
  wrapWalletEncryptionKey,
} from '@shared/crypto/platform-unlock';
import { analytics } from '@shared/utils/analytics';

import { isBiometricAutoPromptSuppressed } from '@app/common/biometric-unlock/biometric-auto-prompt';
import { getWalletSessionKey } from '@app/store/session-restore';
import { persistor } from '@app/store/store';

import * as inMemoryStore from '../in-memory-key/in-memory-storage';
import { startNewWalletAccountDiscovery } from './software-key.actions';
import { initialKeysState, keyAdapter, keySlice } from './software-key.slice';
import { walletAuthenticationActions } from './wallet-authentication';

vi.mock('@app/store/store', () => ({
  persistor: { flush: vi.fn(() => Promise.resolve()) },
  store: { getState: vi.fn(), dispatch: vi.fn() },
}));

vi.mock('@app/common/initial-search-params', () => ({
  initialSearchParams: new URLSearchParams(),
}));

vi.mock('@shared/messages', () => ({
  broadcastWalletListChanged: vi.fn(),
}));

vi.mock('@shared/utils/analytics', () => ({
  analytics: { track: vi.fn() },
  identifyUser: vi.fn(),
}));

vi.mock('./software-key.actions', () => ({
  startNewWalletAccountDiscovery: vi.fn(),
}));

vi.mock('@shared/crypto/platform-authenticator', async importOriginal => {
  const actual = await importOriginal<typeof platformAuthenticator>();
  return { ...actual, createPlatformCredential: vi.fn(), getPlatformPrfOutput: vi.fn() };
});

const createPlatformCredential = vi.mocked(platformAuthenticator.createPlatformCredential);
const getPlatformPrfOutput = vi.mocked(platformAuthenticator.getPlatformPrfOutput);
const { BiometricUnlockError } = platformAuthenticator;

const prfOutput = new Uint8Array(32).fill(5);
const credentialId = encodeBase64Url(new Uint8Array([4, 3, 2, 1, 0, 9]));
const clients = {
  leatherApiClient: { fetchUtxosByAddress: vi.fn(), fetchBitcoinTransactionsByAddress: vi.fn() },
  hiroClient: { getAddressStxBalance: vi.fn(), getAddressTransactions: vi.fn() },
  bnsClient: { fetchAddressBnsNames: vi.fn() },
};

type SoftwareKeysState = ReturnType<typeof keySlice.reducer>;

const mnemonic = generateMnemonic();
const fingerprint = getMnemonicRootKeyFingerprint(mnemonic);

interface Profile {
  encryptionKey: string;
  platformUnlock: PlatformUnlockConfig;
  softwareKeys: SoftwareKeysState;
}

async function makeBiometricProfile(): Promise<Profile> {
  const encryptionKey = generateWalletEncryptionKey();
  const platformUnlock = await wrapWalletEncryptionKey({
    encryptionKey,
    prfOutput,
    credentialId,
    ...generatePlatformUnlockRegistration(),
  });
  const encryptedSecretKey = bytesToHex(await encryptMnemonic(mnemonic, encryptionKey));
  const softwareKeys = keySlice.reducer(
    initialKeysState,
    keySlice.actions.createBiometricWalletComplete({
      platformUnlock,
      key: { type: 'software', id: fingerprint, encryptedSecretKey },
    })
  );
  return { encryptionKey, platformUnlock, softwareKeys };
}

async function persistSoftwareKeys(softwareKeys: unknown) {
  await chrome.storage.local.set({ 'persist:root': { softwareKeys } });
}

function makeHarness(initialSoftwareKeys: SoftwareKeysState) {
  let softwareKeys = initialSoftwareKeys;
  const actions: unknown[] = [];
  const getState = vi.fn();
  getState.mockImplementation(() => ({ softwareKeys }));
  const dispatch = vi.fn();
  dispatch.mockImplementation((action: unknown) => {
    actions.push(action);
    if (keySlice.actions.createBiometricWalletComplete.match(action)) {
      softwareKeys = keySlice.reducer(softwareKeys, action);
    }
    return action;
  });
  return {
    actions,
    dispatch,
    getState,
    getSoftwareKeys() {
      return softwareKeys;
    },
  };
}

function trackedEvents() {
  return vi.mocked(analytics.track).mock.calls.map(call => call[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  inMemoryStore.clearAll();
});

describe('unlockWalletWithBiometrics', () => {
  test('unwraps the key, starts the session and loads every wallet', async () => {
    const profile = await makeBiometricProfile();
    await persistSoftwareKeys(profile.softwareKeys);
    getPlatformPrfOutput.mockResolvedValue(prfOutput);
    const harness = makeHarness(profile.softwareKeys);

    await walletAuthenticationActions.unlockWalletWithBiometrics()(
      harness.dispatch,
      harness.getState,
      undefined
    );

    expect(getPlatformPrfOutput).toHaveBeenCalledWith({
      credentialId: profile.platformUnlock.credentialId,
      prfInput: profile.platformUnlock.prfInput,
    });
    await expect(getWalletSessionKey()).resolves.toMatchObject({ data: profile.encryptionKey });
    expect(inMemoryStore.getKey(fingerprint)).toBe(mnemonic);
    expect(trackedEvents()).toEqual([
      'biometric_unlock_attempt_started',
      'biometric_unlock_attempt_completed',
    ]);
  });

  test('rejects when the persisted profile no longer matches', async () => {
    const profile = await makeBiometricProfile();
    const other = await makeBiometricProfile();
    await persistSoftwareKeys(other.softwareKeys);
    const harness = makeHarness(profile.softwareKeys);

    await expect(
      walletAuthenticationActions.unlockWalletWithBiometrics()(
        harness.dispatch,
        harness.getState,
        undefined
      )
    ).rejects.toMatchObject({ category: 'stale-state' });
    expect(getPlatformPrfOutput).not.toHaveBeenCalled();
    await expect(getWalletSessionKey()).resolves.toMatchObject({ success: false });
  });

  test('rejects a wrong PRF output as invalid config and suppresses the auto prompt', async () => {
    const profile = await makeBiometricProfile();
    await persistSoftwareKeys(profile.softwareKeys);
    getPlatformPrfOutput.mockResolvedValue(new Uint8Array(32).fill(6));
    const harness = makeHarness(profile.softwareKeys);

    await expect(
      walletAuthenticationActions.unlockWalletWithBiometrics()(
        harness.dispatch,
        harness.getState,
        undefined
      )
    ).rejects.toMatchObject({ category: 'invalid-config' });
    await expect(getWalletSessionKey()).resolves.toMatchObject({ success: false });
    await expect(isBiometricAutoPromptSuppressed()).resolves.toBe(true);
    expect(analytics.track).toHaveBeenCalledWith('biometric_unlock_attempt_failed', {
      category: 'invalid-config',
    });
  });

  test('rejects a wallet that does not decrypt with the unwrapped key', async () => {
    const profile = await makeBiometricProfile();
    const softwareKeys = keyAdapter.upsertOne(profile.softwareKeys, {
      type: 'software',
      id: fingerprint,
      encryptedSecretKey: bytesToHex(
        await encryptMnemonic(mnemonic, generateWalletEncryptionKey())
      ),
    });
    await persistSoftwareKeys(softwareKeys);
    getPlatformPrfOutput.mockResolvedValue(prfOutput);
    const harness = makeHarness(softwareKeys);

    await expect(
      walletAuthenticationActions.unlockWalletWithBiometrics()(
        harness.dispatch,
        harness.getState,
        undefined
      )
    ).rejects.toMatchObject({ category: 'wallet-validation' });
    expect(inMemoryStore.getKey(fingerprint)).toBeNull();
    await expect(isBiometricAutoPromptSuppressed()).resolves.toBe(true);
  });

  test('rejects a different credential and suppresses the auto prompt', async () => {
    const profile = await makeBiometricProfile();
    await persistSoftwareKeys(profile.softwareKeys);
    getPlatformPrfOutput.mockRejectedValue(
      new BiometricUnlockError('credential-mismatch', 'mismatch')
    );
    const harness = makeHarness(profile.softwareKeys);

    await expect(
      walletAuthenticationActions.unlockWalletWithBiometrics()(
        harness.dispatch,
        harness.getState,
        undefined
      )
    ).rejects.toMatchObject({ category: 'credential-mismatch' });
    await expect(isBiometricAutoPromptSuppressed()).resolves.toBe(true);
  });

  test('tracks a cancellation without suppressing the auto prompt', async () => {
    const profile = await makeBiometricProfile();
    await persistSoftwareKeys(profile.softwareKeys);
    getPlatformPrfOutput.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));
    const harness = makeHarness(profile.softwareKeys);

    await expect(
      walletAuthenticationActions.unlockWalletWithBiometrics()(
        harness.dispatch,
        harness.getState,
        undefined
      )
    ).rejects.toThrow();
    expect(trackedEvents()).toContain('biometric_unlock_attempt_canceled');
    await expect(isBiometricAutoPromptSuppressed()).resolves.toBe(false);
  });

  test('rejects a password profile', async () => {
    const softwareKeys = keySlice.reducer(
      initialKeysState,
      keySlice.actions.createSoftwareWalletComplete({
        salt: 'salt',
        key: { type: 'software', id: fingerprint, encryptedSecretKey: 'x' },
      })
    );
    const harness = makeHarness(softwareKeys);

    await expect(
      walletAuthenticationActions.unlockWalletWithBiometrics()(
        harness.dispatch,
        harness.getState,
        undefined
      )
    ).rejects.toMatchObject({ category: 'invalid-config' });
  });
});

describe('createBiometricWallet', () => {
  test('enrolls a credential and stores only the wrapped key', async () => {
    createPlatformCredential.mockResolvedValue({ credentialId, prfOutput });
    const harness = makeHarness(initialKeysState);

    await walletAuthenticationActions.createBiometricWallet({
      ...clients,
      mnemonic,
      fingerprint,
    })(harness.dispatch, harness.getState, undefined);

    const sessionKey = await getWalletSessionKey();
    expect(sessionKey.data).toMatch(/^[0-9a-f]{96}$/);
    const softwareKeys = harness.getSoftwareKeys();
    expect(softwareKeys.authenticationMode).toBe('biometric-only');
    expect(softwareKeys.salt).toBeUndefined();
    expect(softwareKeys.platformUnlock?.credentialId).toBe(credentialId);
    expect(JSON.stringify(softwareKeys)).not.toContain(sessionKey.data);
    const storedKey = softwareKeys.entities[fingerprint];
    if (!storedKey || !sessionKey.success) throw new Error('Wallet was not stored');
    await expect(decryptMnemonic(storedKey.encryptedSecretKey, sessionKey.data)).resolves.toBe(
      mnemonic
    );
    expect(harness.actions.some(action => userAddsWallet.match(action))).toBe(true);
    expect(persistor.flush).toHaveBeenCalled();
    expect(startNewWalletAccountDiscovery).toHaveBeenCalled();
    expect(trackedEvents()).toEqual([
      'biometric_unlock_enrollment_started',
      'biometric_unlock_enrollment_completed',
    ]);
  });

  test('asks for the PRF output when the credential creation did not return it', async () => {
    createPlatformCredential.mockResolvedValue({ credentialId, prfOutput: undefined });
    getPlatformPrfOutput.mockResolvedValue(prfOutput);
    const harness = makeHarness(initialKeysState);

    await walletAuthenticationActions.createBiometricWallet({
      ...clients,
      mnemonic,
      fingerprint,
    })(harness.dispatch, harness.getState, undefined);

    expect(getPlatformPrfOutput).toHaveBeenCalledWith(expect.objectContaining({ credentialId }));
    expect(harness.getSoftwareKeys().authenticationMode).toBe('biometric-only');
  });

  test('refuses when another page already stored a software wallet', async () => {
    const profile = await makeBiometricProfile();
    await persistSoftwareKeys(profile.softwareKeys);
    createPlatformCredential.mockResolvedValue({ credentialId, prfOutput });
    const harness = makeHarness(initialKeysState);

    await expect(
      walletAuthenticationActions.createBiometricWallet({ ...clients, mnemonic, fingerprint })(
        harness.dispatch,
        harness.getState,
        undefined
      )
    ).rejects.toMatchObject({ category: 'stale-state' });
    await expect(getWalletSessionKey()).resolves.toMatchObject({ success: false });
    expect(harness.actions).toEqual([]);
  });

  test('tracks a provider without PRF as an enrollment failure', async () => {
    createPlatformCredential.mockRejectedValue(new BiometricUnlockError('no-prf', 'no prf'));
    const harness = makeHarness(initialKeysState);

    await expect(
      walletAuthenticationActions.createBiometricWallet({ ...clients, mnemonic, fingerprint })(
        harness.dispatch,
        harness.getState,
        undefined
      )
    ).rejects.toMatchObject({ category: 'no-prf' });
    expect(analytics.track).toHaveBeenCalledWith('biometric_unlock_enrollment_failed', {
      category: 'no-prf',
    });
  });
});

describe('addWalletWithBiometrics', () => {
  const secondMnemonic = generateMnemonic();
  const secondFingerprint = getMnemonicRootKeyFingerprint(secondMnemonic);

  test('confirms the user and adds the wallet under the same key', async () => {
    const profile = await makeBiometricProfile();
    await persistSoftwareKeys(profile.softwareKeys);
    await chrome.storage.session.set({ encryptionKey: profile.encryptionKey });
    getPlatformPrfOutput.mockResolvedValue(prfOutput);
    const harness = makeHarness(profile.softwareKeys);

    await walletAuthenticationActions.addWalletWithBiometrics({
      ...clients,
      mnemonic: secondMnemonic,
      fingerprint: secondFingerprint,
    })(harness.dispatch, harness.getState, undefined);

    const added = harness.actions.find(keySlice.actions.addNewWallet.match);
    if (!added) throw new Error('Wallet was not added');
    expect(added.payload).toMatchObject({ id: secondFingerprint });
    await expect(
      decryptMnemonic(added.payload.encryptedSecretKey, profile.encryptionKey)
    ).resolves.toBe(secondMnemonic);
    expect(inMemoryStore.getKey(secondFingerprint)).toBe(secondMnemonic);
  });

  test('rejects when the session key belongs to another profile', async () => {
    const profile = await makeBiometricProfile();
    await persistSoftwareKeys(profile.softwareKeys);
    await chrome.storage.session.set({ encryptionKey: generateWalletEncryptionKey() });
    getPlatformPrfOutput.mockResolvedValue(prfOutput);
    const harness = makeHarness(profile.softwareKeys);

    await expect(
      walletAuthenticationActions.addWalletWithBiometrics({
        ...clients,
        mnemonic: secondMnemonic,
        fingerprint: secondFingerprint,
      })(harness.dispatch, harness.getState, undefined)
    ).rejects.toMatchObject({ category: 'wallet-validation' });
    expect(harness.actions).toEqual([]);
  });
});
