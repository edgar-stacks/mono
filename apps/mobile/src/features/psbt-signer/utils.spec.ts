import { describe, expect, it } from 'vitest';

import { type BitcoinTransactionFees, FeeTypes } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { getFeeType } from './utils';

function createQuote(amount: number, rate: number) {
  return {
    type: 'bitcoinFeeRate',
    value: createMoney(amount, 'BTC'),
    rate,
    rateUnit: 'sats/vB',
    estimatedTxSize: 140,
    sizeUnit: 'vB',
  } as const;
}

function createFees(low: number, standard: number, high: number): BitcoinTransactionFees {
  return {
    chain: 'bitcoin',
    options: {
      low: createQuote(low, 2),
      standard: createQuote(standard, 5),
      high: createQuote(high, 10),
    },
  };
}

const fees = createFees(280, 700, 1400);

describe(getFeeType.name, () => {
  it('returns Custom while quotes are not loaded', () => {
    expect(getFeeType({ psbtFee: createMoney(700, 'BTC'), fees: undefined })).toBe(FeeTypes.Custom);
  });

  it('matches each tier by exact amount', () => {
    expect(getFeeType({ psbtFee: createMoney(280, 'BTC'), fees })).toBe(FeeTypes.Low);
    expect(getFeeType({ psbtFee: createMoney(700, 'BTC'), fees })).toBe(FeeTypes.Middle);
    expect(getFeeType({ psbtFee: createMoney(1400, 'BTC'), fees })).toBe(FeeTypes.High);
  });

  it('returns Custom when the fee matches no tier', () => {
    expect(getFeeType({ psbtFee: createMoney(500, 'BTC'), fees })).toBe(FeeTypes.Custom);
  });

  it('prefers standard when tiers share an amount', () => {
    expect(getFeeType({ psbtFee: createMoney(700, 'BTC'), fees: createFees(700, 700, 700) })).toBe(
      FeeTypes.Middle
    );
  });
});
