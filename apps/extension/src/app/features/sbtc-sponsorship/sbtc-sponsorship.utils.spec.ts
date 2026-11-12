import type { StacksTransactionFeeQuote, StacksTransactionFees } from '@leather.io/models';
import { LeatherApiError } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import {
  convertStxFeeToSbtcFee,
  createSbtcSponsoredFees,
  getSbtcSponsoredBalanceLessFee,
  getSbtcSponsorshipErrorMessage,
  getSbtcSponsorshipFeeTier,
  isSbtcSponsorshipQuoteExpired,
  isSbtcSponsorshipRequoteError,
} from './sbtc-sponsorship.utils';

const rate = { satsPerStx: '250.5', minFeeSats: 10, maxFeeSats: 5000 };

function createSponsorshipError(code: string, reason?: string) {
  return new LeatherApiError('https://api.test', 422, 'Unprocessable Entity', {
    error: 'Sponsorship failed',
    code,
    reason,
  });
}

describe(convertStxFeeToSbtcFee.name, () => {
  test('converts the STX fee at the quoted rate and rounds up', () => {
    expect(convertStxFeeToSbtcFee({ ...rate, stxFeeMicro: 1_000_001 }).toString()).toBe('251');
  });

  test('accepts the STX fee as a string', () => {
    expect(convertStxFeeToSbtcFee({ ...rate, stxFeeMicro: '2000000' }).toString()).toBe('501');
  });

  test('clamps to the minimum fee', () => {
    expect(convertStxFeeToSbtcFee({ ...rate, stxFeeMicro: 400 }).toString()).toBe('10');
  });

  test('clamps to the maximum fee', () => {
    expect(convertStxFeeToSbtcFee({ ...rate, stxFeeMicro: 100_000_000 }).toString()).toBe('5000');
  });
});

describe(getSbtcSponsorshipFeeTier.name, () => {
  test('maps form fee types to fee tiers', () => {
    expect(getSbtcSponsorshipFeeTier('Low')).toBe('low');
    expect(getSbtcSponsorshipFeeTier('Middle')).toBe('standard');
    expect(getSbtcSponsorshipFeeTier('High')).toBe('high');
  });

  test('falls back to the standard tier', () => {
    expect(getSbtcSponsorshipFeeTier('Custom')).toBe('standard');
    expect(getSbtcSponsorshipFeeTier('Unknown')).toBe('standard');
    expect(getSbtcSponsorshipFeeTier(undefined)).toBe('standard');
  });
});

describe(isSbtcSponsorshipQuoteExpired.name, () => {
  test('is expired at or after the expiry time', () => {
    const expiresAt = '2026-11-11T00:00:00Z';
    const expiresAtMs = new Date(expiresAt).getTime();
    expect(isSbtcSponsorshipQuoteExpired(expiresAt, expiresAtMs - 1)).toBe(false);
    expect(isSbtcSponsorshipQuoteExpired(expiresAt, expiresAtMs)).toBe(true);
  });
});

describe(isSbtcSponsorshipRequoteError.name, () => {
  test('re-quotes on an expired quote or a stale nonce', () => {
    expect(isSbtcSponsorshipRequoteError(createSponsorshipError('quote_expired'))).toBe(true);
    expect(isSbtcSponsorshipRequoteError(createSponsorshipError('stale_nonce'))).toBe(true);
    expect(isSbtcSponsorshipRequoteError(createSponsorshipError('broadcast_failed'))).toBe(false);
    expect(isSbtcSponsorshipRequoteError(new Error('quote_expired'))).toBe(false);
  });
});

describe(getSbtcSponsorshipErrorMessage.name, () => {
  test('maps error codes to user copy', () => {
    expect(getSbtcSponsorshipErrorMessage(createSponsorshipError('rate_limited'))).toBe(
      'Too many requests. Wait a moment and try again.'
    );
  });

  test('adds a known not eligible reason', () => {
    expect(
      getSbtcSponsorshipErrorMessage(createSponsorshipError('not_eligible', 'float_low'))
    ).toBe(
      "This transfer isn't eligible for sBTC fee payment. The sponsor is temporarily out of STX. Pay the fee in STX or try again later."
    );
  });

  test('shows an unknown not eligible reason', () => {
    expect(
      getSbtcSponsorshipErrorMessage(createSponsorshipError('not_eligible', 'new_reason'))
    ).toBe("This transfer isn't eligible for sBTC fee payment (new_reason)");
  });

  test('falls back to the error detail', () => {
    expect(getSbtcSponsorshipErrorMessage(new Error('Network down'))).toBe('Network down');
    expect(getSbtcSponsorshipErrorMessage(undefined)).toBe('Something went wrong');
  });
});

function createStxFeeQuote(amount: number): StacksTransactionFeeQuote {
  return {
    type: 'stacksFeeRate',
    rate: 1,
    rateUnit: 'µSTX/byte',
    estimatedTxSize: 1,
    sizeUnit: 'byte',
    value: createMoney(amount, 'STX'),
  };
}

const stxFees: StacksTransactionFees = {
  chain: 'stacks',
  minimumFee: createMoney(1, 'STX'),
  highFeeThreshold: createMoney(5_000_000, 'STX'),
  options: {
    low: createStxFeeQuote(100_000),
    standard: createStxFeeQuote(1_000_000),
    high: createStxFeeQuote(4_000_000),
  },
};

describe(createSbtcSponsoredFees.name, () => {
  test('converts every tier to an sBTC fee', () => {
    const fees = createSbtcSponsoredFees(stxFees, rate, 8);
    expect(fees.options.low.value.amount.toString()).toBe('26');
    expect(fees.options.standard.value.amount.toString()).toBe('251');
    expect(fees.options.high.value.amount.toString()).toBe('1002');
    expect(fees.options.standard.value.symbol).toBe('sBTC');
  });
});

describe(getSbtcSponsoredBalanceLessFee.name, () => {
  const sbtcFees = createSbtcSponsoredFees(stxFees, rate, 8);

  test('subtracts the selected tier fee from the balance', () => {
    const balance = createMoney(1_000, 'sBTC', 8);
    expect(getSbtcSponsoredBalanceLessFee(balance, sbtcFees, 'High').amount.toString()).toBe('0');
    expect(getSbtcSponsoredBalanceLessFee(balance, sbtcFees, 'Low').amount.toString()).toBe('974');
  });
});
