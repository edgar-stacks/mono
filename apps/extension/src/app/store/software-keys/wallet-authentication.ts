import { bytesToHex } from '@stacks/common';
import { decryptMnemonic, encryptMnemonic } from '@stacks/encryption';

import {
  deriveRootKeychainFromMnemonicSync,
  getMnemonicRootKeyFingerprint,
} from '@leather.io/crypto';
import { userAddsWallet } from '@leather.io/state/wallet';

import {
  BiometricUnlockError,
  createPlatformCredential,
  getBiometricUnlockFailureCategory,
  getPlatformPrfOutput,
} from '@shared/crypto/platform-authenticator';
import {
  type PlatformUnlockConfig,
  generatePlatformUnlockRegistration,
  generateWalletEncryptionKey,
  unwrapWalletEncryptionKey,
  wrapWalletEncryptionKey,
} from '@shared/crypto/platform-unlock';
import { broadcastWalletListChanged } from '@shared/messages';
import { assumedZeroFingerprint } from '@shared/utils';
import { analytics, identifyUser } from '@shared/utils/analytics';

import {
  clearBiometricAutoPromptSuppression,
  shouldSuppressBiometricAutoPrompt,
  suppressBiometricAutoPrompt,
} from '@app/common/biometric-unlock/biometric-auto-prompt';
import { getWalletSessionKey, initalizeWalletSession } from '@app/store/session-restore';
import { type AppThunk, type RootState, persistor } from '@app/store/store';

import { walletKeyGenerated } from '../active/active.slice';
import * as inMemoryStore from '../in-memory-key/in-memory-storage';
import {
  type PersistedSoftwareKeysState,
  isPersistedBiometricProfile,
  isPersistedProfileEmpty,
  parsePersistedSoftwareKeysState,
} from './software-key-state';
import {
  type AccountDiscoveryClients,
  startNewWalletAccountDiscovery,
} from './software-key.actions';
import { selectSoftwareKeyAuthentication, selectSoftwareKeys } from './software-key.selectors';
import { keySlice } from './software-key.slice';
import { withWalletAuthenticationWriteLock } from './wallet-write-lock';

const persistedRootKey = 'persist:root';

async function readPersistedSoftwareKeysState(): Promise<PersistedSoftwareKeysState | null> {
  try {
    const stored = await chrome.storage.local.get([persistedRootKey]);
    return parsePersistedSoftwareKeysState(stored[persistedRootKey] ?? {});
  } catch {
    return null;
  }
}

function requireBiometricProfile(state: RootState) {
  const authentication = selectSoftwareKeyAuthentication(state);
  if (authentication.mode !== 'biometric-only') {
    throw new BiometricUnlockError('invalid-config', 'This profile has no valid biometric unlock');
  }
  return authentication.platformUnlock;
}

async function requirePersistedBiometricProfile(
  platformUnlock: PlatformUnlockConfig,
  keys: ReturnType<typeof selectSoftwareKeys>
) {
  const persisted = await readPersistedSoftwareKeysState();
  if (!isPersistedBiometricProfile({ persisted, platformUnlock, keys })) {
    throw new BiometricUnlockError('stale-state', 'Stored wallet authentication changed');
  }
}

async function obtainBiometricEncryptionKey(platformUnlock: PlatformUnlockConfig) {
  const prfOutput = await getPlatformPrfOutput({
    credentialId: platformUnlock.credentialId,
    prfInput: platformUnlock.prfInput,
  });
  try {
    return await unwrapWalletEncryptionKey({ config: platformUnlock, prfOutput });
  } catch (error) {
    throw new BiometricUnlockError('invalid-config', 'Could not unwrap the wallet key', {
      cause: error,
    });
  }
}

async function decryptSoftwareKeys(
  keys: ReturnType<typeof selectSoftwareKeys>,
  encryptionKey: string
) {
  try {
    return await Promise.all(
      keys.map(async key => {
        const secretKey = await decryptMnemonic(key.encryptedSecretKey, encryptionKey);
        if (
          key.id !== assumedZeroFingerprint &&
          getMnemonicRootKeyFingerprint(secretKey) !== key.id
        ) {
          throw new Error('Decrypted wallet does not match its fingerprint');
        }
        return { fingerprint: key.id, secretKey };
      })
    );
  } catch (error) {
    throw new BiometricUnlockError('wallet-validation', 'Wallet validation failed', {
      cause: error,
    });
  }
}

async function encryptSecretKey(mnemonic: string, encryptionKey: string) {
  return bytesToHex(await encryptMnemonic(mnemonic, encryptionKey));
}

async function recordAttemptFailure(error: unknown) {
  const category = getBiometricUnlockFailureCategory(error);
  if (category === 'canceled') {
    analytics.track('biometric_unlock_attempt_canceled');
  } else {
    analytics.track('biometric_unlock_attempt_failed', { category });
  }
  if (shouldSuppressBiometricAutoPrompt(category)) await suppressBiometricAutoPrompt();
}

async function runBiometricAttempt<T>(attempt: () => Promise<T>) {
  analytics.track('biometric_unlock_attempt_started');
  try {
    const result = await attempt();
    analytics.track('biometric_unlock_attempt_completed');
    return result;
  } catch (error) {
    await recordAttemptFailure(error);
    throw error;
  }
}

function identifyWalletUser(secretKey: string | undefined) {
  if (!secretKey) return;
  const rootKey = deriveRootKeychainFromMnemonicSync(secretKey);
  if (rootKey.publicKey) void identifyUser(rootKey.publicKey);
}

function unlockWalletWithBiometrics(): AppThunk {
  return async (_dispatch, getState) =>
    runBiometricAttempt(async () => {
      const state = getState();
      const platformUnlock = requireBiometricProfile(state);
      const keys = selectSoftwareKeys(state);
      await requirePersistedBiometricProfile(platformUnlock, keys);

      const encryptionKey = await obtainBiometricEncryptionKey(platformUnlock);
      const decryptedKeys = await decryptSoftwareKeys(keys, encryptionKey);

      await requirePersistedBiometricProfile(platformUnlock, keys);
      await initalizeWalletSession(encryptionKey);
      for (const { fingerprint, secretKey } of decryptedKeys) {
        inMemoryStore.setKey(fingerprint, secretKey);
      }
      await clearBiometricAutoPromptSuppression();
      identifyWalletUser(decryptedKeys[0]?.secretKey);
    });
}

interface NewBiometricWalletArgs extends AccountDiscoveryClients {
  mnemonic: string;
  fingerprint: string;
}

function newSoftwareWalletAdded(fingerprint: string) {
  return userAddsWallet({
    wallet: { createdOn: new Date().toISOString(), fingerprint, type: 'software' },
    accountKeychains: [],
  });
}

async function enrollPlatformUnlock(encryptionKey: string) {
  const { prfInput, registrationTag } = generatePlatformUnlockRegistration();
  const credential = await createPlatformCredential({ prfInput, registrationTag });
  const prfOutput =
    credential.prfOutput ??
    (await getPlatformPrfOutput({ credentialId: credential.credentialId, prfInput }));
  const platformUnlock = await wrapWalletEncryptionKey({
    encryptionKey,
    prfOutput,
    credentialId: credential.credentialId,
    prfInput,
    registrationTag,
  });
  const unwrapped = await unwrapWalletEncryptionKey({ config: platformUnlock, prfOutput });
  if (unwrapped !== encryptionKey) {
    throw new BiometricUnlockError('invalid-config', 'Platform unlock round trip failed');
  }
  return platformUnlock;
}

function createBiometricWallet({
  mnemonic,
  fingerprint,
  ...clients
}: NewBiometricWalletArgs): AppThunk {
  return async (dispatch, getState) => {
    analytics.track('biometric_unlock_enrollment_started');
    try {
      if (selectSoftwareKeyAuthentication(getState()).mode !== 'none') {
        throw new BiometricUnlockError('stale-state', 'A software wallet already exists');
      }

      const encryptionKey = generateWalletEncryptionKey();
      const platformUnlock = await enrollPlatformUnlock(encryptionKey);
      const encryptedSecretKey = await encryptSecretKey(mnemonic, encryptionKey);

      await withWalletAuthenticationWriteLock(async () => {
        const persisted = await readPersistedSoftwareKeysState();
        if (
          !isPersistedProfileEmpty(persisted) ||
          selectSoftwareKeyAuthentication(getState()).mode !== 'none'
        ) {
          throw new BiometricUnlockError('stale-state', 'A software wallet already exists');
        }
        await initalizeWalletSession(encryptionKey);
        inMemoryStore.setKey(fingerprint, mnemonic);
        dispatch(newSoftwareWalletAdded(fingerprint));
        dispatch(
          keySlice.actions.createBiometricWalletComplete({
            platformUnlock,
            key: { type: 'software', id: fingerprint, encryptedSecretKey },
          })
        );
        dispatch(walletKeyGenerated(fingerprint));
        await persistor.flush();
      });
    } catch (error) {
      analytics.track('biometric_unlock_enrollment_failed', {
        category: getBiometricUnlockFailureCategory(error),
      });
      throw error;
    }

    analytics.track('biometric_unlock_enrollment_completed');
    await clearBiometricAutoPromptSuppression();
    void broadcastWalletListChanged({});
    startNewWalletAccountDiscovery({ dispatch, fingerprint, mnemonic, ...clients });
  };
}

function addWalletWithBiometrics({
  mnemonic,
  fingerprint,
  ...clients
}: NewBiometricWalletArgs): AppThunk {
  return async (dispatch, getState) => {
    await runBiometricAttempt(async () => {
      const state = getState();
      const platformUnlock = requireBiometricProfile(state);
      const keys = selectSoftwareKeys(state);
      await requirePersistedBiometricProfile(platformUnlock, keys);

      const encryptionKey = await obtainBiometricEncryptionKey(platformUnlock);
      const decryptedKeys = await decryptSoftwareKeys(keys, encryptionKey);
      const sessionKey = await getWalletSessionKey();
      if (sessionKey.success && sessionKey.data !== encryptionKey) {
        throw new BiometricUnlockError('wallet-validation', 'Session key does not match');
      }
      const encryptedSecretKey = await encryptSecretKey(mnemonic, encryptionKey);

      await withWalletAuthenticationWriteLock(async () => {
        await requirePersistedBiometricProfile(platformUnlock, selectSoftwareKeys(getState()));
        await initalizeWalletSession(encryptionKey);
        for (const decrypted of decryptedKeys) {
          inMemoryStore.setKey(decrypted.fingerprint, decrypted.secretKey);
        }
        inMemoryStore.setKey(fingerprint, mnemonic);
        dispatch(newSoftwareWalletAdded(fingerprint));
        dispatch(
          keySlice.actions.addNewWallet({ type: 'software', id: fingerprint, encryptedSecretKey })
        );
        dispatch(walletKeyGenerated(fingerprint));
        await persistor.flush();
      });
    });

    void broadcastWalletListChanged({});
    startNewWalletAccountDiscovery({ dispatch, fingerprint, mnemonic, ...clients });
  };
}

export const walletAuthenticationActions = {
  addWalletWithBiometrics,
  createBiometricWallet,
  unlockWalletWithBiometrics,
};
