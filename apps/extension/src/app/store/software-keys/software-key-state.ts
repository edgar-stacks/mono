import { z } from 'zod';

import {
  type PlatformUnlockConfig,
  platformUnlockConfigSchema,
} from '@shared/crypto/platform-unlock';

const softwareKeyEntitySchema = z.looseObject({
  type: z.literal('software'),
  id: z.string().min(1),
  encryptedSecretKey: z.string().min(1),
});

const softwareKeysStateSchema = z.looseObject({
  ids: z.array(z.string()),
  entities: z.record(z.string(), softwareKeyEntitySchema),
  salt: z.string().optional(),
  authenticationMode: z.enum(['biometric-only', 'password']).optional(),
  platformUnlock: z.unknown().optional(),
});

type SoftwareKeyAuthentication =
  | { mode: 'none' }
  | { mode: 'password'; salt?: string }
  | { mode: 'biometric-only'; platformUnlock: PlatformUnlockConfig };

export function parseSoftwareKeyAuthentication(value: unknown): SoftwareKeyAuthentication | null {
  const result = softwareKeysStateSchema.safeParse(value);
  if (!result.success) return null;
  const { ids, entities, salt, authenticationMode, platformUnlock } = result.data;

  const hasEntityForEveryId = ids.every(id => entities[id]?.id === id);
  if (!hasEntityForEveryId || ids.length !== Object.keys(entities).length) return null;

  if (ids.length === 0) {
    if (authenticationMode === 'biometric-only' || platformUnlock !== undefined) return null;
    return { mode: 'none' };
  }

  if (authenticationMode === 'biometric-only') {
    if (salt !== undefined) return null;
    const config = platformUnlockConfigSchema.safeParse(platformUnlock);
    if (!config.success) return null;
    return { mode: 'biometric-only', platformUnlock: config.data };
  }

  if (platformUnlock !== undefined) return null;
  if (authenticationMode === 'password' && !salt) return null;
  return { mode: 'password', salt };
}
