import { describe, expect, it } from 'vitest';

import {
  FeeTypes,
  type StacksTransactionFeeQuote,
  type StacksTransactionFees,
} from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { getStacksFeeType, getStacksFeesByType } from './stacks-fees.utils';

function createQuote(amount: number): StacksTransactionFeeQuote {
  return {
    type: 'stacksFeeRate',
    value: createMoney(amount, 'STX'),
    rate: 1,
    rateUnit: 'µSTX/byte',
    estimatedTxSize: 180,
    sizeUnit: 'byte',
  };
}

function createFees(low: number, standard: number, high: number): StacksTransactionFees {
  return {
    chain: 'stacks',
    minimumFee: createMoney(180, 'STX'),
    highFeeThreshold: createMoney(5000000, 'STX'),
    options: {
      low: createQuote(low),
      standard: createQuote(standard),
      high: createQuote(high),
    },
  };
}

describe(getStacksFeesByType.name, () => {
  it('maps each tier quote to its fee type', () => {
    const fees = getStacksFeesByType(createFees(1000, 2000, 3000));

    expect(fees[FeeTypes.Low]).toEqual(createMoney(1000, 'STX'));
    expect(fees[FeeTypes.Middle]).toEqual(createMoney(2000, 'STX'));
    expect(fees[FeeTypes.High]).toEqual(createMoney(3000, 'STX'));
    expect(fees[FeeTypes.Custom]).toEqual(createMoney(0, 'STX'));
    expect(fees[FeeTypes.Unknown]).toEqual(createMoney(0, 'STX'));
  });

  it('returns zero for every fee type while quotes are unloaded', () => {
    const fees = getStacksFeesByType(undefined);

    expect(fees[FeeTypes.Low]).toEqual(createMoney(0, 'STX'));
    expect(fees[FeeTypes.Middle]).toEqual(createMoney(0, 'STX'));
    expect(fees[FeeTypes.High]).toEqual(createMoney(0, 'STX'));
  });
});

describe(getStacksFeeType.name, () => {
  const fees = createFees(1000, 2000, 3000);

  it('returns custom while quotes are unloaded', () => {
    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees: undefined })).toBe(
      FeeTypes.Custom
    );
  });

  it('matches the low, standard and high tiers by exact amount', () => {
    expect(getStacksFeeType({ fee: createMoney(1000, 'STX'), fees })).toBe(FeeTypes.Low);
    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees })).toBe(FeeTypes.Middle);
    expect(getStacksFeeType({ fee: createMoney(3000, 'STX'), fees })).toBe(FeeTypes.High);
  });

  it('returns custom when the fee matches no tier', () => {
    expect(getStacksFeeType({ fee: createMoney(2001, 'STX'), fees })).toBe(FeeTypes.Custom);
  });

  it('prefers the standard tier when tiers share an amount', () => {
    expect(
      getStacksFeeType({ fee: createMoney(2000, 'STX'), fees: createFees(2000, 2000, 2000) })
    ).toBe(FeeTypes.Middle);
  });
});
