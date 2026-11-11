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

export function parseAppPermission(value: unknown, origin: string): AppPermission | null {
  const result = appPermissionSchema.safeParse(value);
  if (!result.success || result.data.origin !== origin) return null;
  return result.data;
}

export function isConnectedToExistingWallet(
  permission: unknown,
  walletEntities: Partial<Record<string, WalletStore>>
): boolean {
  const result = appPermissionSchema.safeParse(permission);
  if (!result.success) return false;
  return !!walletEntities[result.data.fingerprint];
}

export async function getPermissionsByOrigin(origin: string) {
  const rootstate = await getRootState();
  if (!rootstate) return null;
  return parseAppPermission(rootstate.appPermissions.entities[origin], origin);
}
