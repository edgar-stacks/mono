import { isDeepEqual } from 'remeda';
import { z } from 'zod';

import {
  type PlatformUnlockConfig,
  parsePlatformUnlockConfig,
} from '@shared/crypto/platform-unlock';
import { isRecord } from '@shared/utils/is-record';

const softwareKeyEntitySchema = z.object({
  type: z.literal('software'),
  id: z.string().min(1),
  encryptedSecretKey: z.string().min(1),
});

const softwareKeysStateSchema = z.object({
  ids: z.array(z.string()),
  entities: z.record(z.string(), softwareKeyEntitySchema.optional()),
  salt: z.string().optional(),
  authenticationMode: z.enum(['biometric-only', 'password']).optional(),
  platformUnlock: z.unknown().optional(),
});

export interface SoftwareKeyEntry {
  id: string;
  encryptedSecretKey: string;
}

export type SoftwareKeyAuthentication =
  | { mode: 'none' }
  | { mode: 'password'; keys: SoftwareKeyEntry[]; salt?: string }
  | { mode: 'biometric-only'; keys: SoftwareKeyEntry[]; platformUnlock: PlatformUnlockConfig }
  | { mode: 'invalid' };

const invalidState: SoftwareKeyAuthentication = { mode: 'invalid' };

function readKeys(state: z.infer<typeof softwareKeysStateSchema>) {
  const keys: SoftwareKeyEntry[] = [];
  for (const id of state.ids) {
    const entity = state.entities[id];
    if (!entity || entity.id !== id) return null;
    keys.push({ id: entity.id, encryptedSecretKey: entity.encryptedSecretKey });
  }
  if (new Set(state.ids).size !== state.ids.length) return null;
  if (Object.keys(state.entities).length !== state.ids.length) return null;
  return keys;
}

export function resolveSoftwareKeyAuthentication(value: unknown): SoftwareKeyAuthentication {
  if (value === undefined) return { mode: 'none' };
  const parsed = softwareKeysStateSchema.safeParse(value);
  if (!parsed.success) return invalidState;
  const state = parsed.data;

  const keys = readKeys(state);
  if (!keys) return invalidState;
  if (keys.length === 0) return { mode: 'none' };

  switch (state.authenticationMode) {
    case 'biometric-only': {
      const platformUnlock = parsePlatformUnlockConfig(state.platformUnlock);
      if (!platformUnlock || state.salt !== undefined) return invalidState;
      return { mode: 'biometric-only', keys, platformUnlock };
    }
    case 'password':
      if (!state.salt || state.platformUnlock !== undefined) return invalidState;
      return { mode: 'password', keys, salt: state.salt };
    default:
      if (state.platformUnlock !== undefined) return invalidState;
      return { mode: 'password', keys, salt: state.salt };
  }
}

export function hasBiometricAuthenticationState(value: unknown) {
  if (!isRecord(value)) return false;
  return value.authenticationMode === 'biometric-only' || value.platformUnlock !== undefined;
}

export function readPersistedSoftwareKeys(persistedRoot: unknown) {
  return isRecord(persistedRoot) ? persistedRoot.softwareKeys : undefined;
}

export function isSameSoftwareKeyAuthentication(
  a: SoftwareKeyAuthentication,
  b: SoftwareKeyAuthentication
) {
  return isDeepEqual(a, b);
}
