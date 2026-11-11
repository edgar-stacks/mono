import { describe, expect, it } from 'vitest';

import { FeeTypes, type StacksTransactionFees } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { getStacksFeeType, getStacksFeesByType } from './stacks-fees.utils';

function createQuote(amount: number) {
  return {
    type: 'stacksFeeRate',
    value: createMoney(amount, 'STX'),
    rate: 1,
    rateUnit: 'µSTX/byte',
    estimatedTxSize: 180,
    sizeUnit: 'byte',
  } as const;
}

function createFees(low: number, standard: number, high: number): StacksTransactionFees {
  return {
    chain: 'stacks',
    options: { low: createQuote(low), standard: createQuote(standard), high: createQuote(high) },
    minimumFee: createMoney(180, 'STX'),
    highFeeThreshold: createMoney(10_000_000, 'STX'),
  };
}

const fees = createFees(1000, 2000, 3000);

describe(getStacksFeesByType.name, () => {
  it('maps each quote to its fee type', () => {
    const feesByType = getStacksFeesByType(fees);
    expect(feesByType[FeeTypes.Low]).toEqual(createMoney(1000, 'STX'));
    expect(feesByType[FeeTypes.Middle]).toEqual(createMoney(2000, 'STX'));
    expect(feesByType[FeeTypes.High]).toEqual(createMoney(3000, 'STX'));
    expect(feesByType[FeeTypes.Custom]).toEqual(createMoney(0, 'STX'));
    expect(feesByType[FeeTypes.Unknown]).toEqual(createMoney(0, 'STX'));
  });

  it('returns zero fees while quotes are not loaded', () => {
    const feesByType = getStacksFeesByType(undefined);
    expect(feesByType[FeeTypes.Low]).toEqual(createMoney(0, 'STX'));
    expect(feesByType[FeeTypes.Middle]).toEqual(createMoney(0, 'STX'));
    expect(feesByType[FeeTypes.High]).toEqual(createMoney(0, 'STX'));
  });
});

describe(getStacksFeeType.name, () => {
  it('returns Custom while quotes are not loaded', () => {
    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees: undefined })).toBe(
      FeeTypes.Custom
    );
  });

  it('matches each tier by exact amount', () => {
    expect(getStacksFeeType({ fee: createMoney(1000, 'STX'), fees })).toBe(FeeTypes.Low);
    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees })).toBe(FeeTypes.Middle);
    expect(getStacksFeeType({ fee: createMoney(3000, 'STX'), fees })).toBe(FeeTypes.High);
  });

  it('returns Custom when the fee matches no tier', () => {
    expect(getStacksFeeType({ fee: createMoney(2500, 'STX'), fees })).toBe(FeeTypes.Custom);
  });

  it('prefers standard when tiers share an amount', () => {
    expect(
      getStacksFeeType({ fee: createMoney(2000, 'STX'), fees: createFees(2000, 2000, 2000) })
    ).toBe(FeeTypes.Middle);
  });
});
