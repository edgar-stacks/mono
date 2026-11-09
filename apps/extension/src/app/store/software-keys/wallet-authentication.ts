import { bytesToHex } from '@stacks/common';
import { decryptMnemonic, encryptMnemonic } from '@stacks/encryption';

import { getMnemonicRootKeyFingerprint } from '@leather.io/crypto';

import { BiometricUnlockError } from '@shared/biometric-unlock/biometric-unlock-error';
import {
  type PlatformUnlockConfig,
  isWalletEncryptionKey,
  unwrapWalletEncryptionKey,
} from '@shared/crypto/platform-unlock';

import {
  type SoftwareKeyAuthentication,
  type SoftwareKeyEntry,
  isSameSoftwareKeyAuthentication,
  readPersistedSoftwareKeys,
  resolveSoftwareKeyAuthentication,
} from './software-key-state';

const persistedRootStorageKey = 'persist:root';

export async function readPersistedRoot(): Promise<unknown> {
  const stored = await chrome.storage.local.get([persistedRootStorageKey]);
  return stored[persistedRootStorageKey];
}

type BiometricAuthentication = Extract<SoftwareKeyAuthentication, { mode: 'biometric-only' }>;

interface ReadValidatedAuthenticationArgs {
  softwareKeysState: unknown;
  readPersistedRoot(): Promise<unknown>;
}

export async function readValidatedAuthentication({
  softwareKeysState,
  readPersistedRoot,
}: ReadValidatedAuthenticationArgs) {
  const current = resolveSoftwareKeyAuthentication(softwareKeysState);
  const persisted = resolveSoftwareKeyAuthentication(
    readPersistedSoftwareKeys(await readPersistedRoot())
  );
  if (current.mode === 'invalid' || !isSameSoftwareKeyAuthentication(current, persisted))
    throw new BiometricUnlockError('invalid-config', 'Wallet authentication state is invalid');
  return current;
}

export async function readValidatedBiometricAuthentication(
  args: ReadValidatedAuthenticationArgs
): Promise<BiometricAuthentication> {
  const authentication = await readValidatedAuthentication(args);
  if (authentication.mode !== 'biometric-only')
    throw new BiometricUnlockError('invalid-config', 'Biometric unlock is not configured');
  return authentication;
}

interface UnwrapBiometricEncryptionKeyArgs {
  platformUnlock: PlatformUnlockConfig;
  prfOutput: Uint8Array;
}
export async function unwrapBiometricEncryptionKey({
  platformUnlock,
  prfOutput,
}: UnwrapBiometricEncryptionKeyArgs) {
  try {
    return await unwrapWalletEncryptionKey({ config: platformUnlock, prfOutput });
  } catch (error) {
    throw new BiometricUnlockError('credential-mismatch', 'Could not unwrap encryption key', {
      cause: error,
    });
  }
}

export async function decryptSoftwareKeysWithEncryptionKey(
  keys: SoftwareKeyEntry[],
  encryptionKey: string
) {
  if (!isWalletEncryptionKey(encryptionKey))
    throw new BiometricUnlockError('wallet-validation', 'Invalid wallet encryption key');
  try {
    return await Promise.all(
      keys.map(async key => {
        const secretKey = await decryptMnemonic(key.encryptedSecretKey, encryptionKey);
        if (getMnemonicRootKeyFingerprint(secretKey) !== key.id)
          throw new Error('Decrypted key does not match its fingerprint');
        return { fingerprint: key.id, secretKey };
      })
    );
  } catch (error) {
    throw new BiometricUnlockError('wallet-validation', 'Could not validate wallets', {
      cause: error,
    });
  }
}

export async function encryptSecretKeyWithEncryptionKey(secretKey: string, encryptionKey: string) {
  if (!isWalletEncryptionKey(encryptionKey))
    throw new BiometricUnlockError('wallet-validation', 'Invalid wallet encryption key');
  return bytesToHex(await encryptMnemonic(secretKey, encryptionKey));
}
