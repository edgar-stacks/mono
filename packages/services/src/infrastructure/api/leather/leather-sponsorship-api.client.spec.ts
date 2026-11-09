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
  feeRecipientPrincipal: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  expiresAt: '2026-11-09T10:00:00.000Z',
  satsPerStx: '250',
  minFeeSats: 100,
  maxFeeSats: 50_000,
};

const quoteRequest: SbtcSponsorshipQuoteRequest = {
  network: 'mainnet',
  sender: 'SPS8CKF63P16J28AYF7PXW9E5AACH0NZNTEFWSFE',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createHarness(env: Environment, response: Response) {
  const requests: Request[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return Promise.resolve(response);
  });
  vi.stubGlobal('fetch', fetchMock);

  const rateLimiter = createMock<RateLimiterService>({ add: (_type, fn) => fn() });
  const add = vi.spyOn(rateLimiter, 'add');

  return {
    client: new LeatherSponsorshipApiClient(env, rateLimiter),
    add,
    requests,
  };
}

describe(LeatherSponsorshipApiClient.name, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('requests a quote from the production API in production', async () => {
    const h = createHarness({ environment: 'production' }, jsonResponse(200, quote));

    const result = await h.client.fetchSbtcSponsorshipQuote(quoteRequest);

    expect(result).toEqual(quote);
    expect(h.requests[0].url).toBe(`${LEATHER_API_URL_PRODUCTION}/v1/sponsorship/quote`);
    expect(h.requests[0].method).toBe('POST');
    expect(h.requests[0].headers.get('X-Client-ID')).toBeTruthy();
    expect(await h.requests[0].json()).toEqual(quoteRequest);
  });

  it('requests a quote from the staging API outside production', async () => {
    const h = createHarness({ environment: 'development' }, jsonResponse(200, quote));

    await h.client.fetchSbtcSponsorshipQuote(quoteRequest);

    expect(h.requests[0].url).toBe(`${LEATHER_API_URL_STAGING}/v1/sponsorship/quote`);
  });

  it('uses the sponsorship URL override as the base', async () => {
    const h = createHarness(
      { environment: 'production', sponsorshipApiUrl: 'https://sponsor.test/' },
      jsonResponse(200, quote)
    );

    await h.client.fetchSbtcSponsorshipQuote(quoteRequest);

    expect(h.requests[0].url).toBe('https://sponsor.test/v1/sponsorship/quote');
  });

  it('queues requests on the Leather limiter with high priority', async () => {
    const h = createHarness({ environment: 'production' }, jsonResponse(200, quote));

    await h.client.fetchSbtcSponsorshipQuote(quoteRequest);

    expect(h.add).toHaveBeenCalledWith(RateLimiterType.Leather, expect.any(Function), {
      priority: leatherApiPriorities.sponsorshipQuote,
      signal: undefined,
    });
  });

  it('rejects a quote that does not match the schema', async () => {
    const h = createHarness(
      { environment: 'production' },
      jsonResponse(200, { ...quote, quoteId: undefined })
    );

    await expect(h.client.fetchSbtcSponsorshipQuote(quoteRequest)).rejects.toThrow();
  });

  it('posts the quote id and transaction to submit', async () => {
    const submitResult = { txid: '0xabc', transaction: '0x00' };
    const h = createHarness({ environment: 'production' }, jsonResponse(200, submitResult));

    const result = await h.client.submitSbtcSponsoredTransaction({
      quoteId: 'quote-1',
      transaction: '0x01',
    });

    expect(result).toEqual(submitResult);
    expect(h.requests[0].url).toBe(`${LEATHER_API_URL_PRODUCTION}/v1/sponsorship/submit`);
    expect(await h.requests[0].json()).toEqual({ quoteId: 'quote-1', transaction: '0x01' });
  });

  it('throws a typed error carrying the code and reason', async () => {
    const h = createHarness(
      { environment: 'production' },
      jsonResponse(422, {
        error: 'Not eligible',
        code: 'not_eligible',
        reason: 'insufficient_sbtc',
      })
    );

    const error = await h.client
      .submitSbtcSponsoredTransaction({ quoteId: 'quote-1', transaction: '0x01' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LeatherApiError);
    if (!(error instanceof LeatherApiError)) return;
    expect(error.status).toBe(422);
    expect(error.data).toEqual({
      error: 'Not eligible',
      code: 'not_eligible',
      reason: 'insufficient_sbtc',
    });
  });
});
