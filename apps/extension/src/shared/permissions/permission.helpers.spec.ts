import { afterEach, describe, expect, test, vi } from 'vitest';

import type { BitcoinNetworkModes } from '@leather.io/models';
import type { WalletStore } from '@leather.io/state/wallet';

import {
  type AppPermission,
  findAppPermission,
  getPermissionsByOrigin,
  isConnectedToExistingWallet,
} from './permission.helpers';

const mocks = vi.hoisted(() => ({ getRootState: vi.fn() }));

vi.mock('@shared/storage/get-root-state', () => ({ getRootState: mocks.getRootState }));

const origin = 'https://app.com';
const fingerprint = 'a1b2c3d4';
const mainnet: BitcoinNetworkModes = 'mainnet';

function createPermission(overrides: Partial<AppPermission> = {}): AppPermission {
  return {
    origin,
    fingerprint,
    accountIndex: 0,
    requestedAccounts: '2026-01-01T00:00:00.000Z',
    networkMode: mainnet,
    ...overrides,
  };
}

function createWalletEntities(fingerprints: string[]): Partial<Record<string, WalletStore>> {
  const entities: Record<string, WalletStore> = {};
  for (const value of fingerprints)
    entities[value] = { fingerprint: value, type: 'software', name: 'Wallet', createdOn: null };
  return entities;
}

describe('isConnectedToExistingWallet', () => {
  test('returns false when there is no permission', () => {
    expect(isConnectedToExistingWallet(undefined, createWalletEntities([fingerprint]))).toBe(false);
  });

  test('returns false when the permission has not requested accounts', () => {
    const permission = createPermission({ requestedAccounts: undefined });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
      false
    );
  });

  test('returns false when the granted fingerprint no longer has a wallet', () => {
    const permission = createPermission({ fingerprint: 'removed-wallet' });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
      false
    );
  });

  test('returns true when the permission is granted and its wallet still exists', () => {
    const permission = createPermission({ fingerprint });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(true);
  });

  test('returns true regardless of a policy binding on the permission', () => {
    const permission = createPermission({ policyId: `${fingerprint}/0/bc1qaddr/mainnet` });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(true);
  });

  test('returns false when the fingerprint is empty', () => {
    const permission = createPermission({ fingerprint: '' });
    expect(isConnectedToExistingWallet(permission, createWalletEntities(['']))).toBe(false);
  });

  test('returns false when the account index is invalid', () => {
    const permission = createPermission({ accountIndex: -1 });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
      false
    );
  });

  test('returns false when the network mode is unknown', () => {
    const permission = { ...createPermission(), networkMode: 'devnet' };
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
      false
    );
  });

  test('returns false for a legacy hostname-keyed permission', () => {
    const permission = createPermission({ origin: 'app.com' });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
      false
    );
  });

  test('returns false when the origin is not canonical', () => {
    const permission = createPermission({ origin: 'https://app.com:443/path' });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
      false
    );
  });
});

describe('findAppPermission', () => {
  test('returns the permission stored under its canonical origin', () => {
    const permission = createPermission();
    expect(findAppPermission({ [origin]: permission }, origin)).toEqual(permission);
  });

  test('keeps http and https entries for one hostname apart', () => {
    const httpOrigin = 'http://app.com';
    const httpsPermission = createPermission({ accountIndex: 1 });
    const httpPermission = createPermission({ origin: httpOrigin, accountIndex: 2 });
    const entities = { [origin]: httpsPermission, [httpOrigin]: httpPermission };

    expect(findAppPermission(entities, origin)).toEqual(httpsPermission);
    expect(findAppPermission(entities, httpOrigin)).toEqual(httpPermission);
    expect(findAppPermission({ [origin]: httpsPermission }, httpOrigin)).toBeNull();
    expect(findAppPermission({ [origin]: httpsPermission }, 'https://app.com:8443')).toBeNull();
  });

  test('returns null when the stored origin does not match its key', () => {
    const permission = createPermission({ origin: 'http://app.com' });
    expect(findAppPermission({ [origin]: permission }, origin)).toBeNull();
  });

  test('returns null for a legacy hostname-keyed permission', () => {
    const permission = createPermission({ origin: 'app.com' });
    expect(findAppPermission({ 'app.com': permission }, 'app.com')).toBeNull();
  });

  test('returns null for an entry that does not parse', () => {
    expect(findAppPermission({ [origin]: { origin } }, origin)).toBeNull();
    expect(findAppPermission({ [origin]: null }, origin)).toBeNull();
  });
});

describe('getPermissionsByOrigin', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('returns the valid permission for the origin', async () => {
    const permission = createPermission();
    mocks.getRootState.mockResolvedValue({
      appPermissions: { entities: { [origin]: permission } },
    });
    expect(await getPermissionsByOrigin(origin)).toEqual(permission);
  });

  test('returns null for an invalid entry', async () => {
    mocks.getRootState.mockResolvedValue({
      appPermissions: { entities: { [origin]: createPermission({ requestedAccounts: '' }) } },
    });
    expect(await getPermissionsByOrigin(origin)).toBeNull();
  });

  test('returns null when there is no state', async () => {
    mocks.getRootState.mockResolvedValue(null);
    expect(await getPermissionsByOrigin(origin)).toBeNull();
  });
});
