import { SBTC_ASSET_ID_MAINNET } from '@leather.io/constants';
import { FeeTypes } from '@leather.io/models';
import { LeatherApiError } from '@leather.io/services';

import {
  convertStxFeeToSbtcFee,
  getSbtcSponsorshipErrorMessage,
  getSbtcSponsorshipFeeTier,
  isSbtcContractId,
  isSbtcSponsorshipQuoteExpired,
  isSbtcSponsorshipRequoteError,
} from './sbtc-sponsorship.utils';

const quote = { satsPerStx: '250', minFeeSats: 100, maxFeeSats: 5_000 };

function createSponsorshipError(code: string, reason?: string) {
  return new LeatherApiError('https://api.test/v1/sponsorship/submit', 422, 'Unprocessable', {
    error: code,
    code,
    reason,
  });
}

describe(convertStxFeeToSbtcFee.name, () => {
  test('converts micro-STX at the quoted rate', () => {
    expect(convertStxFeeToSbtcFee(2_000_000, quote).toString()).toBe('500');
  });

  test('rounds a fractional sats fee up', () => {
    expect(convertStxFeeToSbtcFee(1_000_001, quote).toString()).toBe('251');
  });

  test('accepts a string fee', () => {
    expect(convertStxFeeToSbtcFee('1500000', quote).toString()).toBe('375');
  });

  test('clamps to the minimum fee', () => {
    expect(convertStxFeeToSbtcFee(1_000, quote).toString()).toBe('100');
  });

  test('clamps to the maximum fee', () => {
    expect(convertStxFeeToSbtcFee(100_000_000, quote).toString()).toBe('5000');
  });

  test('accepts string min and max fees', () => {
    expect(
      convertStxFeeToSbtcFee(100_000_000, {
        ...quote,
        minFeeSats: '1',
        maxFeeSats: '600',
      }).toString()
    ).toBe('600');
  });
});

describe(getSbtcSponsorshipFeeTier.name, () => {
  test('maps each fee type to its tier', () => {
    expect(getSbtcSponsorshipFeeTier(FeeTypes[FeeTypes.Low])).toBe('low');
    expect(getSbtcSponsorshipFeeTier(FeeTypes[FeeTypes.Middle])).toBe('standard');
    expect(getSbtcSponsorshipFeeTier(FeeTypes[FeeTypes.High])).toBe('high');
  });

  test('falls back to standard', () => {
    expect(getSbtcSponsorshipFeeTier(FeeTypes[FeeTypes.Custom])).toBe('standard');
    expect(getSbtcSponsorshipFeeTier(FeeTypes[FeeTypes.Unknown])).toBe('standard');
    expect(getSbtcSponsorshipFeeTier(undefined)).toBe('standard');
  });
});

describe(isSbtcContractId.name, () => {
  test('recognises the sBTC contract', () => {
    expect(isSbtcContractId(SBTC_ASSET_ID_MAINNET.split('::')[0])).toBe(true);
    expect(isSbtcContractId('SP000000000000000000002Q6VF78.leather-integration-tests')).toBe(false);
  });
});

describe(isSbtcSponsorshipQuoteExpired.name, () => {
  const now = Date.parse('2026-11-09T10:00:00.000Z');

  test('is expired once the expiry has passed', () => {
    expect(isSbtcSponsorshipQuoteExpired({ expiresAt: '2026-11-09T09:59:59.000Z' }, now)).toBe(
      true
    );
  });

  test('is not expired before the expiry', () => {
    expect(isSbtcSponsorshipQuoteExpired({ expiresAt: '2026-11-09T10:00:15.000Z' }, now)).toBe(
      false
    );
  });
});

describe(getSbtcSponsorshipErrorMessage.name, () => {
  test('maps not eligible reasons', () => {
    expect(
      getSbtcSponsorshipErrorMessage(createSponsorshipError('not_eligible', 'insufficient_sbtc'))
    ).toBe('Not enough sBTC to cover the amount and the fee');
  });

  test('maps error codes', () => {
    expect(getSbtcSponsorshipErrorMessage(createSponsorshipError('rate_limited'))).toBe(
      'Too many requests to the sponsor. Wait a moment and try again'
    );
  });

  test('falls back for unknown errors', () => {
    expect(getSbtcSponsorshipErrorMessage(new Error('boom'))).toBe(
      'Unable to submit the sponsored transaction'
    );
  });
});

describe(isSbtcSponsorshipRequoteError.name, () => {
  test('requotes on an expired quote or a stale nonce', () => {
    expect(isSbtcSponsorshipRequoteError(createSponsorshipError('quote_expired'))).toBe(true);
    expect(isSbtcSponsorshipRequoteError(createSponsorshipError('stale_nonce'))).toBe(true);
    expect(isSbtcSponsorshipRequoteError(createSponsorshipError('not_eligible'))).toBe(false);
  });
});
