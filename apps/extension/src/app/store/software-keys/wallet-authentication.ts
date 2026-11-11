import { isDeepEqual } from 'remeda';

import {
  PlatformUnlockError,
  createPlatformCredential,
  getPlatformPrfOutput,
} from '@shared/crypto/platform-authenticator';
import {
  type PlatformUnlockConfig,
  generatePlatformUnlockRegistration,
  generateWalletEncryptionKey,
  parsePlatformUnlockConfig,
  unwrapWalletEncryptionKey,
  wrapWalletEncryptionKey,
} from '@shared/crypto/platform-unlock';
import { isRecord } from '@shared/utils/is-record';

import { parseSoftwareKeyAuthentication } from './software-key-state';

const persistRootKey = 'persist:root';

interface PlatformAuthenticator {
  createCredential: typeof createPlatformCredential;
  getPrfOutput: typeof getPlatformPrfOutput;
}

const defaultPlatformAuthenticator: PlatformAuthenticator = {
  createCredential: createPlatformCredential,
  getPrfOutput: getPlatformPrfOutput,
};

export async function enrollPlatformUnlock(
  authenticator: PlatformAuthenticator = defaultPlatformAuthenticator
) {
  const { prfInput, registrationTag } = generatePlatformUnlockRegistration();
  const credential = await authenticator.createCredential({ prfInput, registrationTag });
  const prfOutput =
    credential.prfOutput ??
    (await authenticator.getPrfOutput({ credentialId: credential.credentialId, prfInput }));

  const encryptionKey = generateWalletEncryptionKey();
  const platformUnlock = await wrapWalletEncryptionKey({
    encryptionKey,
    prfOutput,
    credentialId: credential.credentialId,
    prfInput,
    registrationTag,
  });

  const unwrappedEncryptionKey = await unwrapWalletEncryptionKey({
    config: platformUnlock,
    prfOutput,
  });
  if (unwrappedEncryptionKey !== encryptionKey) throw new PlatformUnlockError('invalid-config');

  return { encryptionKey, platformUnlock };
}

export async function unlockPlatformEncryptionKey(
  platformUnlock: PlatformUnlockConfig,
  authenticator: PlatformAuthenticator = defaultPlatformAuthenticator
) {
  const config = parsePlatformUnlockConfig(platformUnlock);
  if (!config) throw new PlatformUnlockError('invalid-config');

  const prfOutput = await authenticator.getPrfOutput({
    credentialId: config.credentialId,
    prfInput: config.prfInput,
  });

  try {
    return await unwrapWalletEncryptionKey({ config, prfOutput });
  } catch {
    throw new PlatformUnlockError('credential-mismatch');
  }
}

export async function readPersistedSoftwareKeys(): Promise<unknown> {
  const stored = await chrome.storage.local.get([persistRootKey]);
  const root: unknown = stored[persistRootKey];
  return isRecord(root) ? root.softwareKeys : undefined;
}

function summarizeSoftwareKeys(value: unknown) {
  const authentication = parseSoftwareKeyAuthentication(value);
  if (!authentication || !isRecord(value) || !isRecord(value.entities)) return null;
  const entities = value.entities;
  const keys = Object.keys(entities)
    .sort()
    .map(id => {
      const entity = entities[id];
      return isRecord(entity) ? [id, entity.encryptedSecretKey] : [id];
    });
  return { authentication, keys };
}

export function isSameSoftwareKeysState(a: unknown, b: unknown) {
  const summaryA = summarizeSoftwareKeys(a);
  const summaryB = summarizeSoftwareKeys(b);
  return summaryA !== null && summaryB !== null && isDeepEqual(summaryA, summaryB);
}

export function getBiometricPlatformUnlock(softwareKeys: unknown) {
  const authentication = parseSoftwareKeyAuthentication(softwareKeys);
  if (authentication?.mode !== 'biometric-only') throw new PlatformUnlockError('invalid-config');
  return authentication.platformUnlock;
}

export async function assertPersistedSoftwareKeysMatch(softwareKeys: unknown) {
  const persisted = await readPersistedSoftwareKeys();
  if (!isSameSoftwareKeysState(persisted, softwareKeys))
    throw new PlatformUnlockError('wallet-validation');
}

export async function assertNoPersistedSoftwareKeys() {
  const persisted = await readPersistedSoftwareKeys();
  if (persisted === undefined) return;
  if (parseSoftwareKeyAuthentication(persisted)?.mode !== 'none')
    throw new PlatformUnlockError('wallet-validation');
}
