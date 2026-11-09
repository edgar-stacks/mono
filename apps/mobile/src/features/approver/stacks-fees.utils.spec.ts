import { describe, expect, test } from 'vitest';

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
    minimumFee: createMoney(180, 'STX'),
    highFeeThreshold: createMoney(1_000_000, 'STX'),
    options: { low: createQuote(low), standard: createQuote(standard), high: createQuote(high) },
  };
}

describe(getStacksFeesByType.name, () => {
  test('maps each tier to its quoted fee', () => {
    const fees = getStacksFeesByType(createFees(1000, 2000, 3000));

    expect(fees[FeeTypes.Low].amount.toNumber()).toEqual(1000);
    expect(fees[FeeTypes.Middle].amount.toNumber()).toEqual(2000);
    expect(fees[FeeTypes.High].amount.toNumber()).toEqual(3000);
    expect(fees[FeeTypes.Custom].amount.toNumber()).toEqual(0);
  });

  test('returns zero fees while quotes are unloaded', () => {
    const fees = getStacksFeesByType(undefined);

    expect(fees[FeeTypes.Middle].amount.toNumber()).toEqual(0);
    expect(fees[FeeTypes.Middle].symbol).toEqual('STX');
  });
});

describe(getStacksFeeType.name, () => {
  test('returns custom while quotes are unloaded', () => {
    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees: undefined })).toEqual(
      FeeTypes.Custom
    );
  });

  test('matches each tier by exact amount', () => {
    const fees = createFees(1000, 2000, 3000);

    expect(getStacksFeeType({ fee: createMoney(1000, 'STX'), fees })).toEqual(FeeTypes.Low);
    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees })).toEqual(FeeTypes.Middle);
    expect(getStacksFeeType({ fee: createMoney(3000, 'STX'), fees })).toEqual(FeeTypes.High);
  });

  test('prefers standard when tiers share an amount', () => {
    const fees = createFees(2000, 2000, 2000);

    expect(getStacksFeeType({ fee: createMoney(2000, 'STX'), fees })).toEqual(FeeTypes.Middle);
  });

  test('returns custom when the fee matches no tier', () => {
    const fees = createFees(1000, 2000, 3000);

    expect(getStacksFeeType({ fee: createMoney(2500, 'STX'), fees })).toEqual(FeeTypes.Custom);
  });
});
