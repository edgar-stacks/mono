import { describe, expect, test } from 'vitest';

import {
  createsTransaction,
  journeyFamilies,
  needsDeviceSignature,
  resolveJourney,
} from './journey-definitions';

function variantIds(familyId: string) {
  return journeyFamilies
    .find(family => family.id === familyId)
    ?.variants.map(variant => variant.id);
}

describe('journeyFamilies', () => {
  test('defines 19 scenario families with unique ids', () => {
    expect(journeyFamilies).toHaveLength(19);
    expect(new Set(journeyFamilies.map(family => family.id)).size).toBe(19);
  });

  test('every variant builds a request for software and Ledger accounts', () => {
    for (const family of journeyFamilies) {
      expect(family.variants.length).toBeGreaterThan(0);
      for (const variant of family.variants) {
        for (const wallet of ['software', 'ledger'] as const) {
          const { request } = resolveJourney({
            familyId: family.id,
            variantId: variant.id,
            wallet,
          });
          expect(request.title).not.toHaveLength(0);
          expect(request.primaryAction).not.toHaveLength(0);
        }
      }
    }
  });

  test('covers the asset, message format, mode and vault variants', () => {
    expect(variantIds('leather-send-swap')).toEqual(['btc', 'stx', 'sbtc', 'swap']);
    expect(variantIds('message-signing')).toEqual(['plain', 'structured', 'bip322']);
    expect(variantIds('psbt-signing')).toEqual(['sign-only', 'broadcast']);
    expect(variantIds('app-transaction')).toEqual([
      'bitcoin-broadcast',
      'bitcoin-sign-only',
      'stacks-broadcast',
      'stacks-sign-only',
    ]);
    for (const vault of ['vault-propose', 'vault-cosign', 'vault-broadcast']) {
      expect(variantIds(vault)).toEqual(['bitcoin', 'stacks']);
    }
  });
});

describe('resolveJourney', () => {
  test('falls back to the first family and variant', () => {
    const journey = resolveJourney({ familyId: 'missing', variantId: 'missing' });
    expect(journey.family.id).toBe('connect');
    expect(journey.variant.id).toBe('first');
  });

  test('vault approvals identify the vault funds separately from the personal signer', () => {
    const { request } = resolveJourney({
      familyId: 'vault-cosign',
      variantId: 'stacks',
      wallet: 'ledger',
    });
    expect(request.account.kind).toBe('vault');
    expect(request.signer?.kind).toBe('ledger');
    expect(request.account.id).not.toBe(request.signer?.id);
  });

  test('generic calls without spending limits show no invented movements', () => {
    for (const familyId of ['generic-mint', 'generic-vote', 'generic-router']) {
      const { request } = resolveJourney({ familyId });
      expect(request.limits).toEqual([]);
      expect(request.movements).toEqual([]);
    }
  });
});

describe('createsTransaction', () => {
  test('sign-only requests, messages and connections create no transaction', () => {
    expect(createsTransaction(resolveJourney({ familyId: 'connect' }).request)).toBe(false);
    expect(createsTransaction(resolveJourney({ familyId: 'message-signing' }).request)).toBe(false);
    expect(
      createsTransaction(
        resolveJourney({ familyId: 'app-transaction', variantId: 'stacks-sign-only' }).request
      )
    ).toBe(false);
    expect(createsTransaction(resolveJourney({ familyId: 'vault-propose' }).request)).toBe(false);
    expect(createsTransaction(resolveJourney({ familyId: 'vault-broadcast' }).request)).toBe(true);
  });
});

describe('needsDeviceSignature', () => {
  test('asks the Ledger to sign except for connections and already-signed requests', () => {
    function needsDevice(familyId: string) {
      return needsDeviceSignature(resolveJourney({ familyId, wallet: 'ledger' }).request);
    }
    expect(needsDevice('leather-send-swap')).toBe(true);
    expect(needsDevice('vault-cosign')).toBe(true);
    expect(needsDevice('connect')).toBe(false);
    expect(needsDevice('vault-broadcast')).toBe(false);
    expect(needsDeviceSignature(resolveJourney({ familyId: 'leather-send-swap' }).request)).toBe(
      false
    );
  });
});
