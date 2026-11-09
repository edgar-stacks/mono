import { afterEach, describe, expect, it, vi } from 'vitest';

import { LEATHER_API_URL_PRODUCTION, LEATHER_API_URL_STAGING } from '@leather.io/constants';

import { createMock } from '../../../test/create-mock';
import type { Environment } from '../../environment';
import { leatherApiPriorities } from '../../rate-limiter/leather-rate-limiter';
import { type RateLimiterService, RateLimiterType } from '../../rate-limiter/rate-limiter.service';
import { LeatherApiError } from './leather-api.error';
import {
  LeatherSponsorshipApiClient,
  type SbtcSponsorshipQuoteRequest,
} from './leather-sponsorship-api.client';

const quote = {
  quoteId: 'quote-1',
  feeRecipientPrincipal: 'SP000000000000000000002Q6VF78',
  expiresAt: '2026-11-09T10:00:00Z',
  satsPerStx: '250',
  minFeeSats: 100,
  maxFeeSats: '5000',
};

const quoteRequest: SbtcSponsorshipQuoteRequest = {
  network: 'mainnet',
  sender: 'SPS8CKF63P16J28AYF7PXW9E5AACH0NZNTEFWSFE',
  nonce: 3,
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function parseRequestBody(request: { body: string } | undefined): unknown {
  if (!request) throw new Error('Expected a request');
  return JSON.parse(request.body);
}

function createHarness(env: Environment, respond: () => Response) {
  const requests: { url: string; init?: RequestInit; body: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      requests.push({ url, init, body: typeof init?.body === 'string' ? init.body : '' });
      return Promise.resolve(respond());
    })
  );
  const rateLimiterCalls: { type: RateLimiterType; options: unknown }[] = [];
  const rateLimiter = createMock<RateLimiterService>({
    add(type, fn, options) {
      rateLimiterCalls.push({ type, options });
      return fn();
    },
  });
  return {
    client: new LeatherSponsorshipApiClient(env, rateLimiter),
    requests,
    rateLimiterCalls,
  };
}

describe(LeatherSponsorshipApiClient.name, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('requests quotes from the production API in production', async () => {
    const h = createHarness({ environment: 'production' }, () => jsonResponse(200, quote));

    await h.client.fetchSbtcQuote(quoteRequest);

    expect(h.requests[0]?.url).toBe(`${LEATHER_API_URL_PRODUCTION}/v1/sponsorship/quote`);
  });

  it('requests quotes from the staging API outside production', async () => {
    const h = createHarness({ environment: 'development' }, () => jsonResponse(200, quote));

    await h.client.fetchSbtcQuote(quoteRequest);

    expect(h.requests[0]?.url).toBe(`${LEATHER_API_URL_STAGING}/v1/sponsorship/quote`);
  });

  it('uses the sponsorship URL override when one is given', async () => {
    const h = createHarness(
      { environment: 'production', sponsorshipApiUrl: 'https://sponsor.test' },
      () => jsonResponse(200, quote)
    );

    await h.client.fetchSbtcQuote(quoteRequest);

    expect(h.requests[0]?.url).toBe('https://sponsor.test/v1/sponsorship/quote');
  });

  it('sends a client id header and parses the quote', async () => {
    const h = createHarness({ environment: 'staging' }, () => jsonResponse(200, quote));

    const result = await h.client.fetchSbtcQuote(quoteRequest);

    expect(result).toEqual({ ...quote, minFeeSats: '100' });
    expect(new Headers(h.requests[0]?.init?.headers).get('X-Client-ID')).toBeTruthy();
    expect(parseRequestBody(h.requests[0])).toEqual(quoteRequest);
  });

  it('rejects a quote response that does not match the schema', async () => {
    const h = createHarness({ environment: 'staging' }, () =>
      jsonResponse(200, { quoteId: 'quote-1' })
    );

    await expect(h.client.fetchSbtcQuote(quoteRequest)).rejects.toThrow();
  });

  it('posts the quote id and transaction to submit', async () => {
    const h = createHarness({ environment: 'staging' }, () =>
      jsonResponse(200, { txid: '0xabc', transaction: '00ff' })
    );

    const result = await h.client.submitSponsoredTransaction({
      quoteId: 'quote-1',
      transaction: '0011',
    });

    expect(result).toEqual({ txid: '0xabc', transaction: '00ff' });
    expect(h.requests[0]?.url).toBe(`${LEATHER_API_URL_STAGING}/v1/sponsorship/submit`);
    expect(h.requests[0]?.init?.method).toBe('POST');
    expect(parseRequestBody(h.requests[0])).toEqual({
      quoteId: 'quote-1',
      transaction: '0011',
    });
  });

  it('throws a typed error carrying the error code and reason', async () => {
    const h = createHarness({ environment: 'staging' }, () =>
      jsonResponse(422, { error: 'Not eligible', code: 'not_eligible', reason: 'fee_too_low' })
    );

    const error = await h.client
      .submitSponsoredTransaction({ quoteId: 'quote-1', transaction: '0011' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LeatherApiError);
    if (!(error instanceof LeatherApiError)) return;
    expect(error.status).toBe(422);
    expect(error.data).toEqual({
      error: 'Not eligible',
      code: 'not_eligible',
      reason: 'fee_too_low',
    });
  });

  it('queues requests through the Leather rate limiter with high priority', async () => {
    const h = createHarness({ environment: 'staging' }, () => jsonResponse(200, quote));

    await h.client.fetchSbtcQuote(quoteRequest);

    expect(h.rateLimiterCalls).toEqual([
      {
        type: RateLimiterType.Leather,
        options: { priority: leatherApiPriorities.sponsorship, signal: undefined },
      },
    ]);
  });
});
