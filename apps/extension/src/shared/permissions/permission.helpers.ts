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

function parseAppPermission(permission: unknown): AppPermission | null {
  const result = appPermissionSchema.safeParse(permission);
  return result.success ? result.data : null;
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
  const parsed = parseAppPermission(rootstate.appPermissions.entities[origin]);
  if (!parsed || parsed.origin !== origin) return null;
  return parsed;
}
