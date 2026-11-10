import { describe, expect, test } from 'vitest';

import type { BitcoinNetworkModes } from '@leather.io/models';
import { fingerprintMigration, userRemovesWallet } from '@leather.io/state/wallet';

import type { AppPermission } from '@shared/permissions/permission.helpers';
import { assumedZeroFingerprint } from '@shared/utils';

import { userRemovesPolicy } from '../policy/policy.slice';
import { appPermissionsSlice } from './app-permissions.slice';

const fingerprintA = 'a1b2c3d4';
const fingerprintB = 'e5f6a7b8';
const mainnet: BitcoinNetworkModes = 'mainnet';

function createPermission(origin: string, fingerprint: string, policyId?: string): AppPermission {
  return {
    origin,
    fingerprint,
    accountIndex: 0,
    requestedAccounts: '2026-01-01T00:00:00.000Z',
    networkMode: mainnet,
    ...(policyId ? { policyId } : {}),
  };
}

function createState(permissions: AppPermission[]) {
  const entities: Record<string, AppPermission> = {};
  for (const permission of permissions) entities[permission.origin] = permission;
  return { ids: permissions.map(permission => permission.origin), entities };
}

describe('appPermissionsSlice', () => {
  test('removes only the removed wallet permissions and leaves others intact', () => {
    const state = createState([
      createPermission('https://app-a.com', fingerprintA),
      createPermission('https://app-a2.com', fingerprintA),
      createPermission('https://app-b.com', fingerprintB),
    ]);

    const result = appPermissionsSlice.reducer(
      state,
      userRemovesWallet({ fingerprint: fingerprintA })
    );

    expect(result.ids).toEqual(['https://app-b.com']);
    expect(result.entities['https://app-a.com']).toBeUndefined();
    expect(result.entities['https://app-a2.com']).toBeUndefined();
    expect(result.entities['https://app-b.com']).toEqual(
      createPermission('https://app-b.com', fingerprintB)
    );
  });

  test('leaves state untouched when removing a wallet with no permissions', () => {
    const state = createState([createPermission('https://app-b.com', fingerprintB)]);

    const result = appPermissionsSlice.reducer(
      state,
      userRemovesWallet({ fingerprint: fingerprintA })
    );

    expect(result).toEqual(state);
  });

  test('re-keys legacy zero-fingerprint permissions on migration', () => {
    const state = createState([
      createPermission('https://legacy.com', assumedZeroFingerprint),
      createPermission('https://other.com', fingerprintB),
    ]);

    const result = appPermissionsSlice.reducer(state, fingerprintMigration(fingerprintA));

    expect(result.ids).toEqual(['https://legacy.com', 'https://other.com']);
    expect(result.entities['https://legacy.com']?.fingerprint).toBe(fingerprintA);
    expect(result.entities['https://other.com']?.fingerprint).toBe(fingerprintB);
  });

  test('replaces the whole permission on update, dropping a previously bound policy', () => {
    const policyId = `${fingerprintA}/0/bc1qaddr/mainnet`;
    const state = createState([createPermission('https://app-a.com', fingerprintA, policyId)]);

    const result = appPermissionsSlice.reducer(
      state,
      appPermissionsSlice.actions.updatePermission(
        createPermission('https://app-a.com', fingerprintA)
      )
    );

    expect(result.entities['https://app-a.com']).toEqual(
      createPermission('https://app-a.com', fingerprintA)
    );
    expect(result.entities['https://app-a.com']?.policyId).toBeUndefined();
  });

  test('strips the policy binding only from origins bound to the removed policy', () => {
    const policyId = `${fingerprintA}/0/bc1qaddr/mainnet`;
    const otherPolicyId = `${fingerprintB}/0/bc1qother/mainnet`;
    const state = createState([
      createPermission('https://app-a.com', fingerprintA, policyId),
      createPermission('https://app-b.com', fingerprintB, otherPolicyId),
      createPermission('https://app-c.com', fingerprintA),
    ]);

    const result = appPermissionsSlice.reducer(state, userRemovesPolicy({ policyId }));

    expect(result.ids).toEqual(['https://app-a.com', 'https://app-b.com', 'https://app-c.com']);
    expect(result.entities['https://app-a.com']?.policyId).toBeUndefined();
    expect(result.entities['https://app-a.com']?.fingerprint).toBe(fingerprintA);
    expect(result.entities['https://app-a.com']?.requestedAccounts).toBe(
      '2026-01-01T00:00:00.000Z'
    );
    expect(result.entities['https://app-b.com']?.policyId).toBe(otherPolicyId);
    expect(result.entities['https://app-c.com']).toEqual(
      createPermission('https://app-c.com', fingerprintA)
    );
  });

  test('keeps separate http and https entries for one hostname', () => {
    const state = createState([createPermission('https://app-a.com', fingerprintA)]);

    const result = appPermissionsSlice.reducer(
      state,
      appPermissionsSlice.actions.updatePermission(
        createPermission('http://app-a.com', fingerprintB)
      )
    );

    expect(result.ids).toEqual(['https://app-a.com', 'http://app-a.com']);
    expect(result.entities['https://app-a.com']?.fingerprint).toBe(fingerprintA);
    expect(result.entities['http://app-a.com']?.fingerprint).toBe(fingerprintB);
  });
});
