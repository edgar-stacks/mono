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

function isCanonicalWebOrigin(origin: string) {
  try {
    return getOriginFromUrl(origin) === origin;
  } catch {
    return false;
  }
}

const appPermissionSchema = z.object({
  origin: z.string().refine(isCanonicalWebOrigin),
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

export function isConnectedToExistingWallet(
  permission: unknown,
  walletEntities: Partial<Record<string, WalletStore>>
): boolean {
  const validPermission = parseAppPermission(permission);
  if (!validPermission) return false;
  return !!walletEntities[validPermission.fingerprint];
}

export async function getPermissionsByOrigin(origin: string) {
  const rootstate = await getRootState();
  if (!rootstate) return null;
  const permission = parseAppPermission(rootstate.appPermissions.entities[origin]);
  if (!permission || permission.origin !== origin) return null;
  return permission;
}
