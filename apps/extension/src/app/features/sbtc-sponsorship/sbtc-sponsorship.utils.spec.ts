import { LeatherApiError } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import {
  convertStxFeeToSbtcFee,
  getSbtcSponsorshipErrorMessage,
  getSbtcSponsorshipFeeTier,
  isEligibleForSbtcSponsorship,
  isSbtcSponsorshipQuoteExpired,
  isSbtcSponsorshipRequoteError,
} from './sbtc-sponsorship.utils';

const rate = { satsPerStx: '1500', minFeeSats: 100, maxFeeSats: 10_000 };
const sbtcContractId = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token';

function sponsorError(data: { error: string; code?: string; reason?: string }) {
  return new LeatherApiError('https://api.leather.io/v1/sponsorship/submit', 422, '', data);
}

describe(convertStxFeeToSbtcFee.name, () => {
  test('converts the STX fee at the quoted rate', () => {
    const fee = convertStxFeeToSbtcFee(2_000_000, rate);

    expect(fee.amount.toString()).toBe('3000');
    expect(fee.symbol).toBe('sBTC');
    expect(fee.decimals).toBe(8);
  });

  test('rounds a fractional sats amount up', () => {
    expect(convertStxFeeToSbtcFee(100_001, rate).amount.toString()).toBe('151');
  });

  test('accepts a fractional rate and a string fee', () => {
    expect(
      convertStxFeeToSbtcFee('300000', { ...rate, satsPerStx: '1234.5678' }).amount.toString()
    ).toBe('371');
  });

  test('clamps to the minimum fee', () => {
    expect(convertStxFeeToSbtcFee(1_000, rate).amount.toString()).toBe('100');
  });

  test('clamps to the maximum fee', () => {
    expect(convertStxFeeToSbtcFee(100_000_000, rate).amount.toString()).toBe('10000');
  });
});

describe(getSbtcSponsorshipFeeTier.name, () => {
  test.each([
    ['Low', 'low'],
    ['Middle', 'standard'],
    ['High', 'high'],
    ['Custom', 'standard'],
    ['Unknown', 'standard'],
    ['', 'standard'],
  ])('maps the %s fee type to the %s tier', (feeType, tier) => {
    expect(getSbtcSponsorshipFeeTier(feeType)).toBe(tier);
  });
});

describe(isEligibleForSbtcSponsorship.name, () => {
  const eligible = {
    contractId: sbtcContractId,
    isStacksPolicy: false,
    sbtcBalance: createMoney(50_000, 'sBTC', 8),
    availableStxBalance: createMoney(100, 'STX'),
    lowestStxFee: createMoney(180, 'STX'),
  };

  test('is eligible with sBTC and too little STX for the lowest fee', () => {
    expect(isEligibleForSbtcSponsorship(eligible)).toBe(true);
  });

  test('is not eligible when the STX balance covers the lowest fee', () => {
    expect(
      isEligibleForSbtcSponsorship({ ...eligible, availableStxBalance: createMoney(180, 'STX') })
    ).toBe(false);
  });

  test('is not eligible for another token', () => {
    expect(
      isEligibleForSbtcSponsorship({ ...eligible, contractId: 'SP000000000000000000002Q6VF78.ltt' })
    ).toBe(false);
  });

  test('is not eligible for a Stacks policy account', () => {
    expect(isEligibleForSbtcSponsorship({ ...eligible, isStacksPolicy: true })).toBe(false);
  });

  test('is not eligible without sBTC', () => {
    expect(
      isEligibleForSbtcSponsorship({ ...eligible, sbtcBalance: createMoney(0, 'sBTC', 8) })
    ).toBe(false);
  });
});

describe(isSbtcSponsorshipQuoteExpired.name, () => {
  const now = Date.parse('2026-11-09T12:00:00.000Z');

  test('is not expired before the expiry time', () => {
    expect(isSbtcSponsorshipQuoteExpired('2026-11-09T12:00:30.000Z', now)).toBe(false);
  });

  test('is expired at the expiry time', () => {
    expect(isSbtcSponsorshipQuoteExpired('2026-11-09T12:00:00.000Z', now)).toBe(true);
  });

  test('treats an unreadable expiry as expired', () => {
    expect(isSbtcSponsorshipQuoteExpired('soon', now)).toBe(true);
  });
});

describe(getSbtcSponsorshipErrorMessage.name, () => {
  test.each([
    ['quote_expired', 'The sBTC fee quote expired. Review the updated fee and confirm again.'],
    ['stale_nonce', 'The account nonce changed. Review the updated transaction and confirm again.'],
    [
      'broadcast_failed',
      "The sponsor couldn't broadcast the transaction. Your sBTC hasn't moved. Try again in a moment.",
    ],
    [
      'upstream_unavailable',
      "The sponsor couldn't reach the Stacks network. Your sBTC hasn't moved. Try again in a moment.",
    ],
    ['rate_limited', 'Too many requests. Wait a moment and try again.'],
  ])('maps the %s code', (code, message) => {
    expect(getSbtcSponsorshipErrorMessage(sponsorError({ error: 'x', code }))).toBe(message);
  });

  test('appends the copy for a known not eligible reason', () => {
    expect(
      getSbtcSponsorshipErrorMessage(
        sponsorError({ error: 'x', code: 'not_eligible', reason: 'float_low' })
      )
    ).toBe(
      "This transfer isn't eligible for sBTC fee payment. The sponsor is temporarily out of STX. Pay the fee in STX or try again later."
    );
  });

  test('appends an unknown not eligible reason in parentheses', () => {
    expect(
      getSbtcSponsorshipErrorMessage(
        sponsorError({ error: 'x', code: 'not_eligible', reason: 'blocked_recipient' })
      )
    ).toBe("This transfer isn't eligible for sBTC fee payment (blocked_recipient)");
  });

  test('falls back to the error detail', () => {
    expect(getSbtcSponsorshipErrorMessage(sponsorError({ error: 'Bad request' }))).toBe(
      'Bad request'
    );
  });

  test('falls back to a generic message', () => {
    expect(getSbtcSponsorshipErrorMessage(null)).toBe('Something went wrong');
  });
});

describe(isSbtcSponsorshipRequoteError.name, () => {
  test.each([
    ['quote_expired', true],
    ['stale_nonce', true],
    ['not_eligible', false],
  ])('treats %s as a requote: %s', (code, expected) => {
    expect(isSbtcSponsorshipRequoteError(sponsorError({ error: 'x', code }))).toBe(expected);
  });
});
