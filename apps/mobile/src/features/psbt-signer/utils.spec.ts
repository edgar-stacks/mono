import { describe, expect, it } from 'vitest';

import { type BitcoinTransactionFees, FeeTypes } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { getFeeType } from './utils';

function createQuote(fee: number, rate: number) {
  return {
    type: 'bitcoinFeeRate',
    value: createMoney(fee, 'BTC'),
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
      high: createQuote(high, 9),
    },
  };
}

const fees = createFees(280, 700, 1260);

describe(getFeeType.name, () => {
  it('returns Custom while quotes are unloaded', () => {
    expect(getFeeType({ psbtFee: createMoney(700, 'BTC'), fees: undefined })).toBe(FeeTypes.Custom);
  });

  it('matches each tier by exact amount', () => {
    expect(getFeeType({ psbtFee: createMoney(280, 'BTC'), fees })).toBe(FeeTypes.Low);
    expect(getFeeType({ psbtFee: createMoney(700, 'BTC'), fees })).toBe(FeeTypes.Middle);
    expect(getFeeType({ psbtFee: createMoney(1260, 'BTC'), fees })).toBe(FeeTypes.High);
  });

  it('returns Custom when the fee matches no tier', () => {
    expect(getFeeType({ psbtFee: createMoney(701, 'BTC'), fees })).toBe(FeeTypes.Custom);
  });

  it('prefers the standard tier when tiers share an amount', () => {
    const flatFees = createFees(700, 700, 700);
    expect(getFeeType({ psbtFee: createMoney(700, 'BTC'), fees: flatFees })).toBe(FeeTypes.Middle);
  });
});
