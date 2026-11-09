import { afterEach, describe, expect, test, vi } from 'vitest';

import type { BitcoinNetworkModes } from '@leather.io/models';
import type { WalletStore } from '@leather.io/state/wallet';

import {
  type AppPermission,
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

  test('returns false when the permission is keyed by a legacy hostname', () => {
    const permission = createPermission({ origin: 'app.com' });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
      false
    );
  });

  test('returns false when the permission origin is not canonical', () => {
    const permissions = [
      createPermission({ origin: 'https://app.com/' }),
      createPermission({ origin: 'https://app.com:443' }),
      createPermission({ origin: 'HTTPS://APP.COM' }),
    ];
    permissions.forEach(permission =>
      expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
        false
      )
    );
  });

  test('returns false when the permission origin is not a web origin', () => {
    const origins = ['about:blank', 'javascript:void(0)', 'data:text/html,hello', 'null'];
    origins.forEach(value =>
      expect(
        isConnectedToExistingWallet(
          createPermission({ origin: value }),
          createWalletEntities([fingerprint])
        )
      ).toBe(false)
    );
  });

  test('returns false when the permission fields are invalid', () => {
    const invalidPermissions: unknown[] = [
      createPermission({ fingerprint: '' }),
      createPermission({ accountIndex: -1 }),
      createPermission({ accountIndex: 1.5 }),
      createPermission({ requestedAccounts: '' }),
      { ...createPermission(), networkMode: 'unknown-network' },
      null,
      'https://app.com',
    ];
    invalidPermissions.forEach(permission =>
      expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint, '']))).toBe(
        false
      )
    );
  });

  test('accepts an origin with a non-default port', () => {
    const permission = createPermission({ origin: 'https://app.com:8443' });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(true);
  });
});

describe('getPermissionsByOrigin', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function mockPermissions(entities: Record<string, unknown>) {
    mocks.getRootState.mockResolvedValue({ appPermissions: { entities } });
  }

  test('returns the permission stored under the requested origin', async () => {
    const permission = createPermission();
    mockPermissions({ [origin]: permission });
    await expect(getPermissionsByOrigin(origin)).resolves.toEqual(permission);
  });

  test('keeps http and https entries of one hostname separate', async () => {
    const httpPermission = createPermission({ origin: 'http://app.com', accountIndex: 1 });
    mockPermissions({ 'http://app.com': httpPermission });
    await expect(getPermissionsByOrigin('https://app.com')).resolves.toBeNull();
    await expect(getPermissionsByOrigin('http://app.com')).resolves.toEqual(httpPermission);
  });

  test('returns null for a legacy hostname-keyed permission', async () => {
    mockPermissions({ 'app.com': createPermission({ origin: 'app.com' }) });
    await expect(getPermissionsByOrigin('app.com')).resolves.toBeNull();
    await expect(getPermissionsByOrigin(origin)).resolves.toBeNull();
  });

  test('returns null when the stored origin differs from its key', async () => {
    mockPermissions({ [origin]: createPermission({ origin: 'https://other.com' }) });
    await expect(getPermissionsByOrigin(origin)).resolves.toBeNull();
  });

  test('returns null for an invalid entry', async () => {
    mockPermissions({ [origin]: createPermission({ accountIndex: -1 }) });
    await expect(getPermissionsByOrigin(origin)).resolves.toBeNull();
  });

  test('returns null when there is no state', async () => {
    mocks.getRootState.mockResolvedValue(null);
    await expect(getPermissionsByOrigin(origin)).resolves.toBeNull();
  });
});
