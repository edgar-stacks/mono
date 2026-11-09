import { z } from 'zod';

import { isValidAccountIndex } from '@leather.io/crypto';
import {
  type AccountId,
  type BitcoinNetworkModes,
  bitcoinNetworkModesSchema,
} from '@leather.io/models';
import type { WalletStore } from '@leather.io/state/wallet';

import { getRootState } from '@shared/storage/get-root-state';
import { getOriginFromUrl } from '@shared/utils/urls';

export interface AppPermission extends AccountId {
  origin: string;
  // Very simple permission system. If property exists with date, user
  // has given permission
  requestedAccounts?: string;
  networkMode: BitcoinNetworkModes;
  policyId?: string;
}

function isCanonicalOrigin(origin: string) {
  try {
    return getOriginFromUrl(origin) === origin;
  } catch {
    return false;
  }
}

const appPermissionSchema = z.object({
  origin: z.string().refine(isCanonicalOrigin),
  fingerprint: z.string().min(1),
  accountIndex: z.number().refine(isValidAccountIndex),
  requestedAccounts: z.string().min(1),
  networkMode: bitcoinNetworkModesSchema,
  policyId: z.string().optional(),
});

function parseAppPermission(value: unknown): AppPermission | null {
  const result = appPermissionSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function findAppPermission(
  entities: Partial<Record<string, unknown>>,
  origin: string
): AppPermission | null {
  const permission = parseAppPermission(entities[origin]);
  if (!permission || permission.origin !== origin) return null;
  return permission;
}

export function isConnectedToExistingWallet(
  permission: unknown,
  walletEntities: Partial<Record<string, WalletStore>>
): boolean {
  const parsed = parseAppPermission(permission);
  if (!parsed) return false;
  return !!walletEntities[parsed.fingerprint];
}

export async function getPermissionsByOrigin(origin: string) {
  const rootstate = await getRootState();
  if (!rootstate) return null;
  return findAppPermission(rootstate.appPermissions.entities, origin);
}
