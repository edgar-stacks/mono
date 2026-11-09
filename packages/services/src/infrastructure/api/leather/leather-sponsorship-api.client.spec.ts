import { afterEach, describe, expect, test, vi } from 'vitest';

import { LEATHER_API_URL_PRODUCTION, LEATHER_API_URL_STAGING } from '@leather.io/constants';

import { createMock } from '../../../test/create-mock';
import type { Environment } from '../../environment';
import type { RateLimiterService } from '../../rate-limiter/rate-limiter.service';
import { LeatherApiError } from './leather-api.error';
import { LeatherSponsorshipApiClient } from './leather-sponsorship-api.client';

const quote = {
  quoteId: 'quote-1',
  feeRecipientPrincipal: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  expiresAt: '2026-11-09T12:00:00Z',
  satsPerStx: '250.5',
  minFeeSats: 100,
  maxFeeSats: 5000,
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createClient(env: Environment, respond: () => Response) {
  const requests: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((request: Request) => {
      requests.push(request);
      return Promise.resolve(respond());
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
    vi.clearAllMocks();
  });

  test('requests a quote from the production API in production', async () => {
    const { client, requests } = createClient({ environment: 'production' }, () =>
      jsonResponse(200, quote)
    );

    await expect(client.fetchQuote()).resolves.toEqual(quote);

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('POST');
    expect(requests[0].url).toBe(`${LEATHER_API_URL_PRODUCTION}/v1/sponsorship/quote`);
    expect(requests[0].headers.get('X-Client-ID')).toBeTruthy();
    expect(requests[0].body).toBeNull();
  });

  test('ignores the Leather API URL override in production', async () => {
    const { client, requests } = createClient(
      { environment: 'production', leatherApiUrl: 'https://api.test' },
      () => jsonResponse(200, quote)
    );

    await client.fetchQuote();

    expect(requests[0].url).toBe(`${LEATHER_API_URL_PRODUCTION}/v1/sponsorship/quote`);
  });

  test('uses staging outside production', async () => {
    const { client, requests } = createClient({ environment: 'development' }, () =>
      jsonResponse(200, quote)
    );

    await client.fetchQuote();

    expect(requests[0].url).toBe(`${LEATHER_API_URL_STAGING}/v1/sponsorship/quote`);
  });

  test('uses the Leather API URL override outside production', async () => {
    const { client, requests } = createClient(
      { environment: 'development', leatherApiUrl: 'https://api.test' },
      () => jsonResponse(200, quote)
    );

    await client.fetchQuote();

    expect(requests[0].url).toBe('https://api.test/v1/sponsorship/quote');
  });

  test('replaces the whole base with an explicit sponsorship URL', async () => {
    const { client, requests } = createClient(
      { environment: 'production', sponsorshipApiUrl: 'https://sponsor.test/base' },
      () => jsonResponse(200, quote)
    );

    await client.fetchQuote();

    expect(requests[0].url).toBe('https://sponsor.test/base/quote');
  });

  test('submits the quote id and transaction as JSON', async () => {
    const submitResponse = { txid: '0xabc', transaction: '0x0000' };
    const { client, requests } = createClient({ environment: 'production' }, () =>
      jsonResponse(200, submitResponse)
    );

    await expect(client.submit({ quoteId: 'quote-1', transaction: '0x0101' })).resolves.toEqual(
      submitResponse
    );

    expect(requests[0].method).toBe('POST');
    expect(requests[0].url).toBe(`${LEATHER_API_URL_PRODUCTION}/v1/sponsorship/submit`);
    expect(requests[0].headers.get('Content-Type')).toBe('application/json');
    await expect(requests[0].json()).resolves.toEqual({
      quoteId: 'quote-1',
      transaction: '0x0101',
    });
  });

  test('throws a LeatherApiError carrying the sponsorship error code and reason', async () => {
    const { client } = createClient({ environment: 'production' }, () =>
      jsonResponse(422, {
        error: 'Not eligible',
        code: 'not_eligible',
        reason: 'insufficient_sbtc',
      })
    );

    const error: unknown = await client
      .submit({ quoteId: 'quote-1', transaction: '0x0101' })
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

  test('rejects a quote that does not match the schema', async () => {
    const { client } = createClient({ environment: 'production' }, () =>
      jsonResponse(200, { ...quote, satsPerStx: 250 })
    );

    await expect(client.fetchQuote()).rejects.toThrow();
  });
});
