import BigNumber from 'bignumber.js';
import { describe, expect, it } from 'vitest';

import {
  FeeTypes,
  type StacksTransactionFeeQuote,
  type StacksTransactionFees,
} from '@leather.io/models';
import { LeatherApiError } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import {
  convertStxFeeToSbtcFeeSats,
  convertStxFeesToSbtcFees,
  getSbtcFeeTier,
  getSbtcSponsorshipErrorMessage,
  getStxFeeMicroForFeeType,
  hasInsufficientStxForFees,
  isSbtcContractId,
  isSbtcQuoteExpired,
  isSbtcRequoteError,
  parseFeeFormValue,
  subtractFeeFromBalance,
} from './sbtc-sponsorship.utils';

const quote = { satsPerStx: '250.5', minFeeSats: '100', maxFeeSats: '5000' };

function createFeeQuote(microStx: number): StacksTransactionFeeQuote {
  return {
    type: 'stacksFeeRate',
    value: createMoney(microStx, 'STX'),
    rate: 1,
    rateUnit: 'µSTX/byte',
    estimatedTxSize: 200,
    sizeUnit: 'byte',
  };
}

const stxFees: StacksTransactionFees = {
  chain: 'stacks',
  minimumFee: createMoney(180, 'STX'),
  highFeeThreshold: createMoney(5_000_000, 'STX'),
  options: {
    low: createFeeQuote(1_000_000),
    standard: createFeeQuote(4_000_000),
    high: createFeeQuote(30_000_000),
  },
};

function createApiError(code: string, reason?: string) {
  return new LeatherApiError('https://api.test', 422, 'Unprocessable', {
    error: 'error',
    code,
    reason,
  });
}

describe(convertStxFeeToSbtcFeeSats.name, () => {
  it('rounds the converted fee up to a whole sat', () => {
    expect(convertStxFeeToSbtcFeeSats({ stxFeeMicro: 1_000_001, quote }).toString()).toEqual('251');
  });

  it('accepts a string fee', () => {
    expect(convertStxFeeToSbtcFeeSats({ stxFeeMicro: '4000000', quote }).toString()).toEqual(
      '1002'
    );
  });

  it('clamps to the minimum fee', () => {
    expect(convertStxFeeToSbtcFeeSats({ stxFeeMicro: 1_000, quote }).toString()).toEqual('100');
  });

  it('clamps to the maximum fee', () => {
    expect(convertStxFeeToSbtcFeeSats({ stxFeeMicro: 30_000_000, quote }).toString()).toEqual(
      '5000'
    );
  });
});

describe(convertStxFeesToSbtcFees.name, () => {
  it('converts every tier into sBTC', () => {
    const sbtcFees = convertStxFeesToSbtcFees(stxFees, quote);

    expect(sbtcFees.options.low.value).toEqual(createMoney(251, 'sBTC', 8));
    expect(sbtcFees.options.standard.value).toEqual(createMoney(1002, 'sBTC', 8));
    expect(sbtcFees.options.high.value).toEqual(createMoney(5000, 'sBTC', 8));
  });
});

describe(getSbtcFeeTier.name, () => {
  it('maps fee types to tiers', () => {
    expect(getSbtcFeeTier(FeeTypes[FeeTypes.Low])).toEqual('low');
    expect(getSbtcFeeTier(FeeTypes[FeeTypes.Middle])).toEqual('standard');
    expect(getSbtcFeeTier(FeeTypes[FeeTypes.High])).toEqual('high');
  });

  it('falls back to the standard tier', () => {
    expect(getSbtcFeeTier(FeeTypes[FeeTypes.Custom])).toEqual('standard');
    expect(getSbtcFeeTier(FeeTypes[FeeTypes.Unknown])).toEqual('standard');
    expect(getSbtcFeeTier(undefined)).toEqual('standard');
  });

  it('returns the STX fee of the selected tier', () => {
    expect(getStxFeeMicroForFeeType(stxFees, FeeTypes[FeeTypes.High]).toNumber()).toEqual(
      30_000_000
    );
  });
});

describe('sBTC balance helpers', () => {
  it('parses decimal fee form values into base units', () => {
    expect(parseFeeFormValue('0.00001002', 8).toString()).toEqual('1002');
    expect(parseFeeFormValue('', 8).toString()).toEqual('0');
    expect(parseFeeFormValue(undefined, 8).toString()).toEqual('0');
  });

  it('subtracts the fee from the balance without going negative', () => {
    const balance = createMoney(1_500, 'sBTC', 8);
    expect(subtractFeeFromBalance(balance, new BigNumber(1_002)).amount.toNumber()).toEqual(498);
    expect(subtractFeeFromBalance(balance, new BigNumber(2_000)).amount.toNumber()).toEqual(0);
  });

  it('detects an STX balance below the lowest fee', () => {
    expect(hasInsufficientStxForFees(createMoney(0, 'STX'), stxFees)).toBe(true);
    expect(hasInsufficientStxForFees(createMoney(1_000_000, 'STX'), stxFees)).toBe(false);
  });

  it('recognises the sBTC token contracts', () => {
    expect(isSbtcContractId('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token')).toBe(true);
    expect(isSbtcContractId('SP000000000000000000002Q6VF78.leather-integration-tests')).toBe(false);
  });
});

describe('sponsorship quotes and errors', () => {
  it('treats past or invalid expiry dates as expired', () => {
    const now = Date.parse('2026-11-09T10:00:00Z');
    expect(isSbtcQuoteExpired('2026-11-09T09:59:59Z', now)).toBe(true);
    expect(isSbtcQuoteExpired('2026-11-09T10:00:30Z', now)).toBe(false);
    expect(isSbtcQuoteExpired('not a date', now)).toBe(true);
  });

  it('re-quotes on expired quotes and stale nonces only', () => {
    expect(isSbtcRequoteError(createApiError('quote_expired'))).toBe(true);
    expect(isSbtcRequoteError(createApiError('stale_nonce'))).toBe(true);
    expect(isSbtcRequoteError(createApiError('broadcast_failed'))).toBe(false);
    expect(isSbtcRequoteError(new Error('boom'))).toBe(false);
  });

  it('maps not eligible reasons and error codes to copy', () => {
    expect(getSbtcSponsorshipErrorMessage(createApiError('not_eligible', 'fee_too_low'))).toEqual(
      'The sBTC fee is too low for the sponsor to pay the network fee'
    );
    expect(getSbtcSponsorshipErrorMessage(createApiError('rate_limited'))).toEqual(
      'Too many requests to the sponsorship service. Try again in a moment'
    );
    expect(getSbtcSponsorshipErrorMessage(new Error('boom'))).toEqual(
      'The sponsored transaction could not be submitted'
    );
  });
});
