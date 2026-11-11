import { describe, expect, it } from 'vitest';

import { amount, toBaseUnits } from '../scenarios/approval-assets';
import { leatherSwapRequest } from '../scenarios/leather-scenarios';
import { vaultRequest } from '../scenarios/vault-scenarios';
import {
  applyBalanceChanges,
  createJourneyWorld,
  parseWalletShape,
  portfolioEntries,
  settleRequest,
} from './journey-world';

describe(createJourneyWorld.name, () => {
  it('gives software and Ledger wallets their own addresses', () => {
    const software = createJourneyWorld('software');
    const ledger = createJourneyWorld('ledger');
    expect(software.addresses.stacks).not.toBe(ledger.addresses.stacks);
    expect(ledger.accountName).toBe('Ledger account');
  });

  it('starts every run from the same historical reference', () => {
    expect(createJourneyWorld('software').portfolios).toEqual(
      createJourneyWorld('software').portfolios
    );
    expect(createJourneyWorld('ledger').referenceDate).toBe('2026-11-01');
  });

  it('keeps the vault funds apart from the account', () => {
    const world = createJourneyWorld('software');
    expect(world.vault.addresses.bitcoin).not.toBe(world.addresses.bitcoin);
    expect(world.portfolios.vault.BTC).toBe(toBaseUnits('BTC', 1.85));
  });
});

describe(parseWalletShape.name, () => {
  it('defaults to a software wallet', () => {
    expect(parseWalletShape(null)).toBe('software');
    expect(parseWalletShape('hardware')).toBe('software');
    expect(parseWalletShape('ledger')).toBe('ledger');
  });
});

describe(applyBalanceChanges.name, () => {
  it('adds new assets and adjusts existing ones', () => {
    const next = applyBalanceChanges({ STX: 100 }, [
      { symbol: 'STX', amount: -40 },
      { symbol: 'sBTC', amount: 5 },
    ]);
    expect(next).toEqual({ STX: 60, sBTC: 5 });
  });
});

describe(settleRequest.name, () => {
  it('applies movements and the fee once confirmed', () => {
    const { portfolios } = createJourneyWorld('software');
    const next = settleRequest(portfolios, leatherSwapRequest('software'), 'confirmed');
    expect(next.account.STX).toBe(
      (portfolios.account.STX ?? 0) - toBaseUnits('STX', 1500) - toBaseUnits('STX', 0.0045)
    );
    expect(next.account.sBTC).toBe((portfolios.account.sBTC ?? 0) + toBaseUnits('sBTC', 0.00961));
  });

  it('applies only the fee when a submitted call fails', () => {
    const { portfolios } = createJourneyWorld('software');
    const next = settleRequest(portfolios, leatherSwapRequest('software'), 'failed-on-chain');
    expect(next.account.STX).toBe((portfolios.account.STX ?? 0) - toBaseUnits('STX', 0.0045));
    expect(next.account.sBTC).toBe(portfolios.account.sBTC);
  });

  it('settles vault requests against the vault', () => {
    const { portfolios } = createJourneyWorld('software');
    const next = settleRequest(
      portfolios,
      vaultRequest('software', 'bitcoin', 'broadcast'),
      'confirmed'
    );
    expect(next.account).toEqual(portfolios.account);
    expect(next.vault.BTC).toBe(
      (portfolios.vault.BTC ?? 0) - toBaseUnits('BTC', 0.25) - toBaseUnits('BTC', 0.0000412)
    );
  });
});

describe(portfolioEntries.name, () => {
  it('lists held assets in a stable order', () => {
    expect(portfolioEntries({ sBTC: 1, BTC: 2 })).toEqual([
      { symbol: 'BTC', amount: 2 },
      { symbol: 'sBTC', amount: 1 },
    ]);
    expect(portfolioEntries({})).toEqual([]);
    expect(amount('BTC', 1).amount).toBe(100_000_000);
  });
});
