import { afterEach, describe, expect, it, vi } from 'vitest';

import { LEATHER_API_URL_PRODUCTION, LEATHER_API_URL_STAGING } from '@leather.io/constants';

import { createMock } from '../../../test/create-mock';
import type { Environment } from '../../environment';
import type { RateLimiterService } from '../../rate-limiter/rate-limiter.service';
import { LeatherApiError } from './leather-api.error';
import { LeatherSponsorshipApiClient } from './leather-sponsorship-api.client';

const quote = {
  quoteId: 'quote-1',
  feeRecipientPrincipal: 'SP000000000000000000002Q6VF78',
  expiresAt: '2026-11-11T00:01:00Z',
  satsPerStx: '250.5',
  minFeeSats: 10,
  maxFeeSats: 5000,
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createHarness(env: Environment, response: Response) {
  const requests: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return Promise.resolve(response);
    })
  );
  const rateLimiter = createMock<RateLimiterService>({
    add: (_type, fn) => fn(),
  });
  return { client: new LeatherSponsorshipApiClient(env, rateLimiter), requests };
}

describe(LeatherSponsorshipApiClient.name, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the production Leather API in production', async () => {
    const h = createHarness(
      { environment: 'production', leatherApiUrl: 'https://api.test' },
      jsonResponse(200, quote)
    );

    await h.client.fetchSbtcQuote();

    expect(h.requests[0]?.url).toBe(`${LEATHER_API_URL_PRODUCTION}/v1/sponsorship/quote`);
  });

  it('uses the staging Leather API outside production', async () => {
    const h = createHarness({ environment: 'development' }, jsonResponse(200, quote));

    await h.client.fetchSbtcQuote();

    expect(h.requests[0]?.url).toBe(`${LEATHER_API_URL_STAGING}/v1/sponsorship/quote`);
  });

  it('replaces the whole base with the sponsorship API override', async () => {
    const h = createHarness(
      { environment: 'production', sponsorshipApiUrl: 'https://sponsor.test/v1/sponsorship' },
      jsonResponse(200, quote)
    );

    await h.client.fetchSbtcQuote();

    expect(h.requests[0]?.url).toBe('https://sponsor.test/v1/sponsorship/quote');
  });

  it('posts a quote request without a body and parses the quote', async () => {
    const h = createHarness({ environment: 'staging' }, jsonResponse(200, quote));

    const result = await h.client.fetchSbtcQuote();

    expect(result).toEqual(quote);
    expect(h.requests[0]?.method).toBe('POST');
    expect(h.requests[0]?.headers.get('X-Client-ID')).toBeTruthy();
    expect(await h.requests[0]?.text()).toBe('');
  });

  it('submits the quote id and transaction as JSON', async () => {
    const submitResponse = { txid: 'abc', transaction: '0x00' };
    const h = createHarness({ environment: 'staging' }, jsonResponse(200, submitResponse));

    const result = await h.client.submitSbtcTransaction({
      quoteId: 'quote-1',
      transaction: '0x01',
    });

    expect(result).toEqual(submitResponse);
    expect(h.requests[0]?.url).toBe(`${LEATHER_API_URL_STAGING}/v1/sponsorship/submit`);
    expect(h.requests[0]?.headers.get('Content-Type')).toBe('application/json');
    expect(await h.requests[0]?.json()).toEqual({ quoteId: 'quote-1', transaction: '0x01' });
  });

  it('throws a LeatherApiError carrying the error code and reason', async () => {
    const h = createHarness(
      { environment: 'staging' },
      jsonResponse(422, { error: 'Not eligible', code: 'not_eligible', reason: 'float_low' })
    );

    const error = await h.client
      .submitSbtcTransaction({ quoteId: 'quote-1', transaction: '0x01' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LeatherApiError);
    expect(LeatherApiError.isLeatherApiError(error) && error.data).toEqual({
      error: 'Not eligible',
      code: 'not_eligible',
      reason: 'float_low',
    });
  });
});
