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

const fingerprint = 'a1b2c3d4';
const mainnet: BitcoinNetworkModes = 'mainnet';
const origin = 'https://app.com';

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

function createRootState(entities: Record<string, unknown>) {
  return { appPermissions: { ids: Object.keys(entities), entities } };
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

  test('returns true for an http permission on a non-default port', () => {
    const permission = createPermission({ origin: 'http://localhost:3000' });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(true);
  });

  test.each([
    ['a legacy hostname key', { origin: 'app.com' }],
    ['a legacy localhost key', { origin: 'localhost:3000' }],
    ['an origin with a path', { origin: 'https://app.com/' }],
    ['an origin with a default port', { origin: 'https://app.com:443' }],
    ['an about:blank origin', { origin: 'about:blank' }],
    ['a javascript: origin', { origin: 'javascript:void(0)' }],
    ['a data: origin', { origin: 'data:text/html,hello' }],
    ['an opaque null origin', { origin: 'null' }],
    ['an empty fingerprint', { fingerprint: '' }],
    ['a negative account index', { accountIndex: -1 }],
    ['a fractional account index', { accountIndex: 1.5 }],
    ['an empty requestedAccounts', { requestedAccounts: '' }],
    ['an unknown network mode', { networkMode: 'regtestnet' }],
  ])('returns false for %s', (_, overrides) => {
    const permission = { ...createPermission(), ...overrides };
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
      false
    );
  });

  test('returns false for a value that is not a permission', () => {
    expect(isConnectedToExistingWallet('connected', createWalletEntities([fingerprint]))).toBe(
      false
    );
  });
});

describe('getPermissionsByOrigin', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('returns the permission stored under the origin', async () => {
    mocks.getRootState.mockResolvedValue(createRootState({ [origin]: createPermission() }));

    expect(await getPermissionsByOrigin(origin)).toEqual(createPermission());
  });

  test('keeps http and https entries for one hostname separate', async () => {
    const httpOrigin = 'http://app.com';
    mocks.getRootState.mockResolvedValue(
      createRootState({
        [origin]: createPermission({ accountIndex: 1 }),
        [httpOrigin]: createPermission({ origin: httpOrigin, accountIndex: 2 }),
      })
    );

    expect((await getPermissionsByOrigin(origin))?.accountIndex).toBe(1);
    expect((await getPermissionsByOrigin(httpOrigin))?.accountIndex).toBe(2);
    expect(await getPermissionsByOrigin('https://app.com:8443')).toBeNull();
  });

  test('returns null when only a legacy hostname-keyed permission exists', async () => {
    mocks.getRootState.mockResolvedValue(
      createRootState({ 'app.com': createPermission({ origin: 'app.com' }) })
    );

    expect(await getPermissionsByOrigin(origin)).toBeNull();
    expect(await getPermissionsByOrigin('app.com')).toBeNull();
  });

  test('returns null when the stored origin does not match its key', async () => {
    mocks.getRootState.mockResolvedValue(
      createRootState({ [origin]: createPermission({ origin: 'http://app.com' }) })
    );

    expect(await getPermissionsByOrigin(origin)).toBeNull();
  });

  test('returns null for an invalid stored permission', async () => {
    mocks.getRootState.mockResolvedValue(
      createRootState({ [origin]: createPermission({ fingerprint: '' }) })
    );

    expect(await getPermissionsByOrigin(origin)).toBeNull();
  });

  test('returns null when there is no state', async () => {
    mocks.getRootState.mockResolvedValue(null);

    expect(await getPermissionsByOrigin(origin)).toBeNull();
  });
});
