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

const grantedAppPermissionSchema = z.object({
  origin: z.string(),
  fingerprint: z.string().min(1),
  accountIndex: z.number().refine(isValidAccountIndex),
  requestedAccounts: z.string().min(1),
  networkMode: bitcoinNetworkModesSchema,
  policyId: z.string().optional(),
});

function isCanonicalOrigin(origin: string) {
  try {
    return getOriginFromUrl(origin) === origin;
  } catch {
    return false;
  }
}

export function parseAppPermission(origin: string, value: unknown) {
  const result = grantedAppPermissionSchema.safeParse(value);
  if (!result.success) return null;
  if (result.data.origin !== origin || !isCanonicalOrigin(origin)) return null;
  return result.data;
}

export function isConnectedToExistingWallet(
  origin: string,
  permission: unknown,
  walletEntities: Partial<Record<string, WalletStore>>
): boolean {
  const grantedPermission = parseAppPermission(origin, permission);
  if (!grantedPermission) return false;
  return !!walletEntities[grantedPermission.fingerprint];
}

export async function getPermissionsByOrigin(origin: string) {
  const rootstate = await getRootState();
  if (!rootstate) return null;
  return parseAppPermission(origin, rootstate.appPermissions.entities[origin]);
}
