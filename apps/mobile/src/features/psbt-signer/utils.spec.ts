import { describe, expect, test } from 'vitest';

import { type BitcoinTransactionFees, FeeTypes } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { getFeeType } from './utils';

function createQuote(amount: number, rate: number) {
  return {
    type: 'bitcoinFeeRate',
    value: createMoney(amount, 'BTC'),
    rate,
    rateUnit: 'sats/vB',
    estimatedTxSize: 141,
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

describe(getFeeType.name, () => {
  test('returns custom while quotes are unloaded', () => {
    expect(getFeeType({ psbtFee: createMoney(705, 'BTC'), fees: undefined })).toEqual(
      FeeTypes.Custom
    );
  });

  test('matches each tier by exact amount', () => {
    const fees = createFees(282, 705, 1269);

    expect(getFeeType({ psbtFee: createMoney(282, 'BTC'), fees })).toEqual(FeeTypes.Low);
    expect(getFeeType({ psbtFee: createMoney(705, 'BTC'), fees })).toEqual(FeeTypes.Middle);
    expect(getFeeType({ psbtFee: createMoney(1269, 'BTC'), fees })).toEqual(FeeTypes.High);
  });

  test('prefers standard when tiers share an amount', () => {
    const fees = createFees(705, 705, 705);

    expect(getFeeType({ psbtFee: createMoney(705, 'BTC'), fees })).toEqual(FeeTypes.Middle);
  });

  test('returns custom when the fee matches no tier', () => {
    const fees = createFees(282, 705, 1269);

    expect(getFeeType({ psbtFee: createMoney(800, 'BTC'), fees })).toEqual(FeeTypes.Custom);
  });
});
