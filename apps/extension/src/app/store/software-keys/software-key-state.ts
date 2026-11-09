import { isPlainObject } from 'remeda';

import {
  type PlatformUnlockConfig,
  parsePlatformUnlockConfig,
} from '@shared/crypto/platform-unlock';

export type WalletAuthenticationMode = 'biometric-only' | 'password';

interface SoftwareKeysAuthenticationState {
  ids: readonly unknown[];
  salt?: unknown;
  authenticationMode?: unknown;
  platformUnlock?: unknown;
}

type SoftwareKeyAuthentication =
  | { mode: 'none' }
  | { mode: 'password'; salt?: string }
  | { mode: 'biometric-only'; platformUnlock: PlatformUnlockConfig }
  | { mode: 'invalid' };

function isPresent(value: unknown) {
  return value !== undefined;
}

export function resolveSoftwareKeyAuthentication({
  ids,
  salt,
  authenticationMode,
  platformUnlock,
}: SoftwareKeysAuthenticationState): SoftwareKeyAuthentication {
  if (ids.length === 0) {
    if (isPresent(authenticationMode) || isPresent(platformUnlock)) return { mode: 'invalid' };
    return { mode: 'none' };
  }

  if (authenticationMode === 'biometric-only') {
    if (isPresent(salt)) return { mode: 'invalid' };
    const config = parsePlatformUnlockConfig(platformUnlock);
    return config ? { mode: 'biometric-only', platformUnlock: config } : { mode: 'invalid' };
  }

  if (authenticationMode === 'password') {
    if (isPresent(platformUnlock)) return { mode: 'invalid' };
    return typeof salt === 'string' && salt.length > 0
      ? { mode: 'password', salt }
      : { mode: 'invalid' };
  }

  if (isPresent(authenticationMode) || isPresent(platformUnlock)) return { mode: 'invalid' };
  if (salt === undefined) return { mode: 'password' };
  return typeof salt === 'string' ? { mode: 'password', salt } : { mode: 'invalid' };
}

interface PersistedSoftwareKey {
  id: string;
  encryptedSecretKey: string;
}

export interface PersistedSoftwareKeysState extends SoftwareKeysAuthenticationState {
  ids: string[];
  keys: PersistedSoftwareKey[];
}

function parsePersistedSoftwareKey(id: string, entities: Record<string, unknown>) {
  const entity = entities[id];
  if (!isPlainObject(entity)) return null;
  if (entity.id !== id || typeof entity.encryptedSecretKey !== 'string') return null;
  return { id, encryptedSecretKey: entity.encryptedSecretKey };
}

export function parsePersistedSoftwareKeysState(root: unknown): PersistedSoftwareKeysState | null {
  if (!isPlainObject(root)) return null;
  const slice = root.softwareKeys;
  if (slice === undefined) return { ids: [], keys: [] };
  if (!isPlainObject(slice)) return null;

  const { ids, entities, salt, authenticationMode, platformUnlock } = slice;
  if (!Array.isArray(ids) || !isPlainObject(entities)) return null;

  const keys: PersistedSoftwareKey[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') return null;
    const key = parsePersistedSoftwareKey(id, entities);
    if (!key) return null;
    keys.push(key);
  }

  return { ids: keys.map(key => key.id), keys, salt, authenticationMode, platformUnlock };
}

function hasSameKeys(expected: readonly PersistedSoftwareKey[], actual: PersistedSoftwareKey[]) {
  if (expected.length !== actual.length) return false;
  return expected.every(expectedKey =>
    actual.some(
      key => key.id === expectedKey.id && key.encryptedSecretKey === expectedKey.encryptedSecretKey
    )
  );
}

function hasSamePlatformUnlock(expected: PlatformUnlockConfig, actual: PlatformUnlockConfig) {
  return (
    expected.version === actual.version &&
    expected.credentialId === actual.credentialId &&
    expected.prfInput === actual.prfInput &&
    expected.registrationTag === actual.registrationTag &&
    expected.iv === actual.iv &&
    expected.wrappedEncryptionKey === actual.wrappedEncryptionKey
  );
}

interface IsPersistedBiometricProfileArgs {
  persisted: PersistedSoftwareKeysState | null;
  platformUnlock: PlatformUnlockConfig;
  keys: readonly PersistedSoftwareKey[];
}
export function isPersistedBiometricProfile({
  persisted,
  platformUnlock,
  keys,
}: IsPersistedBiometricProfileArgs) {
  if (!persisted) return false;
  const authentication = resolveSoftwareKeyAuthentication(persisted);
  if (authentication.mode !== 'biometric-only') return false;
  if (!hasSamePlatformUnlock(platformUnlock, authentication.platformUnlock)) return false;
  return hasSameKeys(keys, persisted.keys);
}

export function isPersistedProfileEmpty(persisted: PersistedSoftwareKeysState | null) {
  if (!persisted) return false;
  return resolveSoftwareKeyAuthentication(persisted).mode === 'none';
}
