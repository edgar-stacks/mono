import { describe, expect, test } from 'vitest';

import type { BitcoinNetworkModes } from '@leather.io/models';
import type { WalletStore } from '@leather.io/state/wallet';

import {
  type AppPermission,
  isConnectedToExistingWallet,
  parseAppPermission,
} from './permission.helpers';

const fingerprint = 'a1b2c3d4';
const origin = 'https://app.com';
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

  test('returns false for a legacy hostname-keyed permission', () => {
    const permission = createPermission({ origin: 'app.com' });
    expect(isConnectedToExistingWallet(permission, createWalletEntities([fingerprint]))).toBe(
      false
    );
  });

  test('returns false for a permission that does not parse', () => {
    const walletEntities = createWalletEntities([fingerprint, '']);
    const invalidPermissions: unknown[] = [
      null,
      'https://app.com',
      createPermission({ origin: 'https://app.com/' }),
      createPermission({ origin: 'https://app.com:443' }),
      createPermission({ origin: 'about:blank' }),
      createPermission({ fingerprint: '' }),
      createPermission({ accountIndex: -1 }),
      createPermission({ accountIndex: 1.5 }),
      createPermission({ requestedAccounts: '' }),
      { ...createPermission(), networkMode: 'unknown' },
    ];

    invalidPermissions.forEach(permission =>
      expect(isConnectedToExistingWallet(permission, walletEntities)).toBe(false)
    );
  });
});

describe('parseAppPermission', () => {
  test('returns the permission when it is valid and keyed by its origin', () => {
    const permission = createPermission();
    expect(parseAppPermission(permission, origin)).toEqual(permission);
  });

  test('returns null when the key differs from the permission origin', () => {
    expect(parseAppPermission(createPermission(), 'http://app.com')).toBeNull();
    expect(parseAppPermission(createPermission(), 'https://app.com:8443')).toBeNull();
  });

  test('returns null for a legacy hostname-keyed permission', () => {
    expect(parseAppPermission(createPermission({ origin: 'app.com' }), 'app.com')).toBeNull();
  });

  test('returns null for a non-web origin', () => {
    const invalidOrigins = ['about:blank', 'javascript:void(0)', 'data:text/html,hi', 'null'];
    invalidOrigins.forEach(value =>
      expect(parseAppPermission(createPermission({ origin: value }), value)).toBeNull()
    );
  });

  test('returns null when there is no permission', () => {
    expect(parseAppPermission(undefined, origin)).toBeNull();
  });
});
