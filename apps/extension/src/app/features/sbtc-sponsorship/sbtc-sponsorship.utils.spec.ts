import BigNumber from 'bignumber.js';
import { describe, expect, test } from 'vitest';

import { LeatherApiError } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import {
  calculateSbtcSponsorshipFee,
  getSbtcSponsorshipErrorMessage,
  getSbtcSponsorshipFeeTier,
  isSbtcContractId,
  isSbtcSponsorshipQuoteExpired,
  isSbtcSponsorshipRequoteError,
  subtractSbtcSponsorshipFee,
} from './sbtc-sponsorship.utils';

const quote = { satsPerStx: '250', minFeeSats: 100, maxFeeSats: 5000 };

function sponsorshipError(data: { error: string; code?: string; reason?: string }) {
  return new LeatherApiError('https://api.test/v1/sponsorship/submit', 422, 'Unprocessable', data);
}

describe(calculateSbtcSponsorshipFee.name, () => {
  test('converts the STX fee to sats and rounds up', () => {
    expect(calculateSbtcSponsorshipFee(1_000_001, quote)).toEqual(new BigNumber(251));
  });

  test('accepts string input', () => {
    expect(calculateSbtcSponsorshipFee('2000000', { ...quote, satsPerStx: '250.5' })).toEqual(
      new BigNumber(501)
    );
  });

  test('clamps to the minimum fee', () => {
    expect(calculateSbtcSponsorshipFee(1_000, quote)).toEqual(new BigNumber(100));
  });

  test('clamps to the maximum fee', () => {
    expect(calculateSbtcSponsorshipFee(100_000_000, quote)).toEqual(new BigNumber(5000));
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
  ])('maps %s to %s', (feeType, tier) => {
    expect(getSbtcSponsorshipFeeTier(feeType)).toBe(tier);
  });
});

describe(subtractSbtcSponsorshipFee.name, () => {
  test('subtracts the fee from the balance', () => {
    const balance = createMoney(1_000, 'sBTC', 8);
    expect(subtractSbtcSponsorshipFee(balance, createMoney(300, 'sBTC', 8)).amount).toEqual(
      new BigNumber(700)
    );
  });

  test('never goes below zero', () => {
    const balance = createMoney(100, 'sBTC', 8);
    expect(subtractSbtcSponsorshipFee(balance, createMoney(300, 'sBTC', 8)).amount).toEqual(
      new BigNumber(0)
    );
  });
});

describe(isSbtcContractId.name, () => {
  test('recognises the mainnet and testnet sBTC contracts only', () => {
    expect(isSbtcContractId('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token')).toBe(true);
    expect(isSbtcContractId('SNGWPN3XDAQE673MXYXF81016M50NHF5X5PWWM70.sbtc-token')).toBe(true);
    expect(isSbtcContractId('SP265WBWD4NH7TVPYQTVD23X3607NNK4484DTXQZ3.longcoin')).toBe(false);
  });
});

describe(isSbtcSponsorshipQuoteExpired.name, () => {
  const now = Date.parse('2026-11-09T12:00:00Z');

  test('is expired at or after the expiry', () => {
    expect(isSbtcSponsorshipQuoteExpired('2026-11-09T12:00:00Z', now)).toBe(true);
    expect(isSbtcSponsorshipQuoteExpired('2026-11-09T11:59:00Z', now)).toBe(true);
  });

  test('is not expired before the expiry', () => {
    expect(isSbtcSponsorshipQuoteExpired('2026-11-09T12:00:15Z', now)).toBe(false);
  });

  test('treats an unreadable expiry as expired', () => {
    expect(isSbtcSponsorshipQuoteExpired('not a date', now)).toBe(true);
  });
});

describe(isSbtcSponsorshipRequoteError.name, () => {
  test('re-quotes on an expired quote or a stale nonce', () => {
    expect(
      isSbtcSponsorshipRequoteError(sponsorshipError({ error: 'x', code: 'quote_expired' }))
    ).toBe(true);
    expect(
      isSbtcSponsorshipRequoteError(sponsorshipError({ error: 'x', code: 'stale_nonce' }))
    ).toBe(true);
  });

  test('does not re-quote on other errors', () => {
    expect(
      isSbtcSponsorshipRequoteError(sponsorshipError({ error: 'x', code: 'broadcast_failed' }))
    ).toBe(false);
    expect(isSbtcSponsorshipRequoteError(new Error('quote_expired'))).toBe(false);
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
  ])('maps %s to its copy', (code, message) => {
    expect(getSbtcSponsorshipErrorMessage(sponsorshipError({ error: 'x', code }))).toBe(message);
  });

  test('explains a known not-eligible reason', () => {
    expect(
      getSbtcSponsorshipErrorMessage(
        sponsorshipError({ error: 'x', code: 'not_eligible', reason: 'float_low' })
      )
    ).toBe(
      "This transfer isn't eligible for sBTC fee payment. The sponsor is temporarily out of STX. Pay the fee in STX or try again later."
    );
  });

  test('shows an unknown not-eligible reason in brackets', () => {
    expect(
      getSbtcSponsorshipErrorMessage(
        sponsorshipError({ error: 'x', code: 'not_eligible', reason: 'new_reason' })
      )
    ).toBe("This transfer isn't eligible for sBTC fee payment (new_reason)");
  });

  test('falls back to the error detail', () => {
    expect(getSbtcSponsorshipErrorMessage(sponsorshipError({ error: 'Upstream said no' }))).toBe(
      'Upstream said no'
    );
    expect(getSbtcSponsorshipErrorMessage(new Error('Network down'))).toBe('Network down');
  });

  test('falls back to a generic message', () => {
    expect(getSbtcSponsorshipErrorMessage('nope')).toBe('Something went wrong');
  });
});
