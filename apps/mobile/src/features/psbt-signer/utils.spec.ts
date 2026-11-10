import { describe, expect, it } from 'vitest';

import {
  type BitcoinTransactionFeeQuote,
  type BitcoinTransactionFees,
  FeeTypes,
} from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { getFeeType } from './utils';

function createQuote(amount: number, rate: number): BitcoinTransactionFeeQuote {
  return {
    type: 'bitcoinFeeRate',
    value: createMoney(amount, 'BTC'),
    rate,
    rateUnit: 'sats/vB',
    estimatedTxSize: 141,
    sizeUnit: 'vB',
  };
}

function createFees(low: number, standard: number, high: number): BitcoinTransactionFees {
  return {
    chain: 'bitcoin',
    options: {
      low: createQuote(low, 1),
      standard: createQuote(standard, 2),
      high: createQuote(high, 3),
    },
  };
}

describe(getFeeType.name, () => {
  const fees = createFees(141, 282, 423);

  it('returns custom while quotes are unloaded', () => {
    expect(getFeeType({ psbtFee: createMoney(282, 'BTC'), fees: undefined })).toBe(FeeTypes.Custom);
  });

  it('matches the low, standard and high tiers by exact amount', () => {
    expect(getFeeType({ psbtFee: createMoney(141, 'BTC'), fees })).toBe(FeeTypes.Low);
    expect(getFeeType({ psbtFee: createMoney(282, 'BTC'), fees })).toBe(FeeTypes.Middle);
    expect(getFeeType({ psbtFee: createMoney(423, 'BTC'), fees })).toBe(FeeTypes.High);
  });

  it('returns custom when the fee matches no tier', () => {
    expect(getFeeType({ psbtFee: createMoney(300, 'BTC'), fees })).toBe(FeeTypes.Custom);
  });

  it('prefers the standard tier when tiers share an amount', () => {
    expect(getFeeType({ psbtFee: createMoney(282, 'BTC'), fees: createFees(282, 282, 282) })).toBe(
      FeeTypes.Middle
    );
  });
});
