import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { BitcoinNetworkModes } from '@leather.io/models';
import type { WalletStore } from '@leather.io/state/wallet';

import {
  type AppPermission,
  getPermissionsByOrigin,
  isConnectedToExistingWallet,
  parseAppPermission,
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
    expect(
      isConnectedToExistingWallet(origin, undefined, createWalletEntities([fingerprint]))
    ).toBe(false);
  });

  test('returns false when the permission has not requested accounts', () => {
    const permission = createPermission({ requestedAccounts: undefined });
    expect(
      isConnectedToExistingWallet(origin, permission, createWalletEntities([fingerprint]))
    ).toBe(false);
  });

  test('returns false when the granted fingerprint no longer has a wallet', () => {
    const permission = createPermission({ fingerprint: 'removed-wallet' });
    expect(
      isConnectedToExistingWallet(origin, permission, createWalletEntities([fingerprint]))
    ).toBe(false);
  });

  test('returns true when the permission is granted and its wallet still exists', () => {
    const permission = createPermission({ fingerprint });
    expect(
      isConnectedToExistingWallet(origin, permission, createWalletEntities([fingerprint]))
    ).toBe(true);
  });

  test('returns true regardless of a policy binding on the permission', () => {
    const permission = createPermission({ policyId: `${fingerprint}/0/bc1qaddr/mainnet` });
    expect(
      isConnectedToExistingWallet(origin, permission, createWalletEntities([fingerprint]))
    ).toBe(true);
  });

  test('returns false for a legacy permission keyed by hostname', () => {
    const permission = createPermission({ origin: 'app.com' });
    expect(
      isConnectedToExistingWallet('app.com', permission, createWalletEntities([fingerprint]))
    ).toBe(false);
  });

  test('returns false when the permission belongs to another origin', () => {
    const permission = createPermission({ origin: 'http://app.com' });
    expect(
      isConnectedToExistingWallet(origin, permission, createWalletEntities([fingerprint]))
    ).toBe(false);
  });
});

describe('parseAppPermission', () => {
  test('accepts a granted permission keyed by its canonical origin', () => {
    const permission = createPermission();
    expect(parseAppPermission(origin, permission)).toEqual(permission);
  });

  test('rejects a permission whose origin is not canonical', () => {
    const nonCanonical = 'https://app.com:443';
    expect(parseAppPermission(nonCanonical, createPermission({ origin: nonCanonical }))).toBeNull();
  });

  test('rejects permissions keyed by non-web origins', () => {
    const nonWebOrigins = ['about:blank', 'javascript:void(0)', 'data:text/html,hi', 'null'];
    nonWebOrigins.forEach(value => {
      expect(parseAppPermission(value, createPermission({ origin: value }))).toBeNull();
    });
  });

  test.each([
    ['an empty fingerprint', { fingerprint: '' }],
    ['a negative account index', { accountIndex: -1 }],
    ['a fractional account index', { accountIndex: 1.5 }],
    ['empty requested accounts', { requestedAccounts: '' }],
    ['an unknown network mode', { networkMode: 'devnet' }],
  ])('rejects a permission with %s', (_, overrides) => {
    expect(parseAppPermission(origin, { ...createPermission(), ...overrides })).toBeNull();
  });

  test('rejects values that are not permissions', () => {
    expect(parseAppPermission(origin, null)).toBeNull();
    expect(parseAppPermission(origin, 'granted')).toBeNull();
  });
});

describe('getPermissionsByOrigin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns the permission stored for the exact origin', async () => {
    const permission = createPermission();
    mocks.getRootState.mockResolvedValue({
      appPermissions: { entities: { [origin]: permission } },
    });

    expect(await getPermissionsByOrigin(origin)).toEqual(permission);
  });

  test('returns null for an invalid stored permission', async () => {
    mocks.getRootState.mockResolvedValue({
      appPermissions: {
        entities: { [origin]: createPermission({ requestedAccounts: undefined }) },
      },
    });

    expect(await getPermissionsByOrigin(origin)).toBeNull();
  });

  test('returns null when the state is missing', async () => {
    mocks.getRootState.mockResolvedValue(null);

    expect(await getPermissionsByOrigin(origin)).toBeNull();
  });
});
