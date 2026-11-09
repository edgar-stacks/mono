import { describe, expect, it } from 'vitest';

import {
  type JourneyOutcome,
  deriveJourneyWorld,
  formatSignedAssetAmount,
  getAccountUsdValue,
  getJourneyAccount,
} from './journey-world';

function outcome(overrides: Partial<JourneyOutcome>): JourneyOutcome {
  return {
    requestId: 1,
    accountId: 'personal',
    feePayer: 'personal',
    title: 'Sent Bitcoin',
    status: 'confirmed',
    movements: [{ asset: 'btc', amount: -200_000 }],
    fee: { asset: 'btc', amount: 1_000 },
    ...overrides,
  };
}

describe('deriveJourneyWorld', () => {
  it('starts from the seeded history', () => {
    const world = deriveJourneyWorld('software', []);
    expect(world.balances.personal.btc).toBe(1_250_000);
    expect(world.balances['bitcoin-vault'].btc).toBe(5_000_000);
    expect(world.activity.every(entry => entry.isHistorical)).toBe(true);
  });

  it('applies confirmed movements and their fee', () => {
    const world = deriveJourneyWorld('software', [outcome({})]);
    expect(world.balances.personal.btc).toBe(1_250_000 - 200_000 - 1_000);
    expect(world.activity[0]).toEqual(
      expect.objectContaining({ key: 'request-1', status: 'confirmed', isHistorical: false })
    );
  });

  it('charges only the fee of a failed transaction', () => {
    const world = deriveJourneyWorld('software', [outcome({ status: 'failed' })]);
    expect(world.balances.personal.btc).toBe(1_250_000 - 1_000);
    expect(world.activity[0]?.movements).toEqual([]);
  });

  it('moves vault funds without touching the personal account', () => {
    const world = deriveJourneyWorld('software', [
      outcome({ accountId: 'bitcoin-vault', feePayer: 'bitcoin-vault' }),
    ]);
    expect(world.balances.personal.btc).toBe(1_250_000);
    expect(world.balances['bitcoin-vault'].btc).toBe(5_000_000 - 201_000);
  });

  it('lists newest activity first', () => {
    const world = deriveJourneyWorld('software', [
      outcome({ requestId: 1 }),
      outcome({ requestId: 2 }),
    ]);
    expect(world.activity.slice(0, 2).map(entry => entry.key)).toEqual(['request-2', 'request-1']);
  });

  it('names the personal account after the wallet kind', () => {
    expect(getJourneyAccount(deriveJourneyWorld('ledger', []), 'personal')?.kind).toBe('ledger');
    expect(getJourneyAccount(deriveJourneyWorld('software', []), 'personal')?.name).toBe(
      'Account 1'
    );
  });

  it('values an account in USD', () => {
    const world = deriveJourneyWorld('software', []);
    expect(getAccountUsdValue(world, 'stacks-vault')).toBeCloseTo(12_000);
  });
});

describe('formatSignedAssetAmount', () => {
  it('signs amounts from the account perspective', () => {
    expect(formatSignedAssetAmount({ asset: 'btc', amount: -200_000 })).toBe('−0.002 BTC');
    expect(formatSignedAssetAmount({ asset: 'stx', amount: 2_500_000 })).toBe('+2.5 STX');
  });
});
