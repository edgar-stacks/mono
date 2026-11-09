import { describe, expect, it } from 'vitest';

import { FeeTypes, type StacksTransactionFees } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { getStacksFeeType, getStacksFeesByType } from './stacks-fees.utils';

function createQuote(fee: number) {
  return {
    type: 'stacksFeeRate',
    value: createMoney(fee, 'STX'),
    rate: 1,
    rateUnit: 'µSTX/byte',
    estimatedTxSize: 180,
    sizeUnit: 'byte',
  } as const;
}

function createFees(low: number, standard: number, high: number): StacksTransactionFees {
  return {
    chain: 'stacks',
    minimumFee: createMoney(180, 'STX'),
    highFeeThreshold: createMoney(500000, 'STX'),
    options: {
      low: createQuote(low),
      standard: createQuote(standard),
      high: createQuote(high),
    },
  };
}

const fees = createFees(1000, 2000, 4000);

describe(getStacksFeesByType.name, () => {
  it('maps each quote to its fee type', () => {
    const feesByType = getStacksFeesByType(fees);
    expect(feesByType[FeeTypes.Low]).toEqual(createMoney(1000, 'STX'));
    expect(feesByType[FeeTypes.Middle]).toEqual(createMoney(2000, 'STX'));
    expect(feesByType[FeeTypes.High]).toEqual(createMoney(4000, 'STX'));
    expect(feesByType[FeeTypes.Custom]).toEqual(createMoney(0, 'STX'));
    expect(feesByType[FeeTypes.Unknown]).toEqual(createMoney(0, 'STX'));
  });

  it('returns zero fees while quotes are unloaded', () => {
    const feesByType = getStacksFeesByType(undefined);
    expect(feesByType[FeeTypes.Low]).toEqual(createMoney(0, 'STX'));
    expect(feesByType[FeeTypes.Middle]).toEqual(createMoney(0, 'STX'));
    expect(feesByType[FeeTypes.High]).toEqual(createMoney(0, 'STX'));
  });
});

describe(getStacksFeeType.name, () => {
  it('returns Custom while quotes are unloaded', () => {
    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees: undefined })).toBe(
      FeeTypes.Custom
    );
  });

  it('matches each tier by exact amount', () => {
    expect(getStacksFeeType({ fee: createMoney(1000, 'STX'), fees })).toBe(FeeTypes.Low);
    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees })).toBe(FeeTypes.Middle);
    expect(getStacksFeeType({ fee: createMoney(4000, 'STX'), fees })).toBe(FeeTypes.High);
  });

  it('returns Custom when the fee matches no tier', () => {
    expect(getStacksFeeType({ fee: createMoney(3000, 'STX'), fees })).toBe(FeeTypes.Custom);
  });

  it('prefers the standard tier when tiers share an amount', () => {
    const flatFees = createFees(2000, 2000, 2000);
    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees: flatFees })).toBe(
      FeeTypes.Middle
    );
  });
});
