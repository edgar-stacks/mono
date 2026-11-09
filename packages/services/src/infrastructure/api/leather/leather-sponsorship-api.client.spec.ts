import { afterEach, describe, expect, test, vi } from 'vitest';

import { LEATHER_API_URL_PRODUCTION, LEATHER_API_URL_STAGING } from '@leather.io/constants';

import type { Environment } from '../../environment';
import { RateLimiterService, type RateLimiterType } from '../../rate-limiter/rate-limiter.service';
import type { SettingsService } from '../../settings/settings.service';
import { LeatherApiError } from './leather-api.error';
import {
  LeatherSponsorshipApiClient,
  type SbtcSponsorshipQuote,
  getLeatherSponsorshipErrorCode,
} from './leather-sponsorship-api.client';

const quote: SbtcSponsorshipQuote = {
  quoteId: 'quote-1',
  feeRecipientPrincipal: 'SP2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
  expiresAt: '2026-11-09T12:00:00.000Z',
  satsPerStx: '1234.5',
  minFeeSats: 100,
  maxFeeSats: 50_000,
};

class ImmediateRateLimiterService extends RateLimiterService {
  override add<T>(_type: RateLimiterType, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

const settingsService: SettingsService = {
  getSettings() {
    throw new Error('Settings should not be read in this test');
  },
};

function createClient(env: Environment) {
  return new LeatherSponsorshipApiClient(env, new ImmediateRateLimiterService(settingsService));
}

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json' },
  });
}

function stubFetch(response: () => Response) {
  const requests: Request[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((request: Request) => {
      requests.push(request);
      return Promise.resolve(response());
    })
  );
  return requests;
}

describe(LeatherSponsorshipApiClient.name, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('requests a quote from the production API in production', async () => {
    const requests = stubFetch(() => jsonResponse(quote));

    const result = await createClient({ environment: 'production' }).fetchSbtcQuote();

    expect(result).toEqual(quote);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('POST');
    expect(requests[0].url).toBe(`${LEATHER_API_URL_PRODUCTION}/v1/sponsorship/quote`);
    expect(requests[0].headers.get('X-Client-ID')).toEqual(expect.any(String));
    expect(await requests[0].text()).toBe('');
  });

  test('requests a quote from staging outside production', async () => {
    const requests = stubFetch(() => jsonResponse(quote));

    await createClient({ environment: 'development' }).fetchSbtcQuote();

    expect(requests[0].url).toBe(`${LEATHER_API_URL_STAGING}/v1/sponsorship/quote`);
  });

  test('uses the Leather API URL from the environment outside production', async () => {
    const requests = stubFetch(() => jsonResponse(quote));

    await createClient({
      environment: 'development',
      leatherApiUrl: 'https://leather-api.local',
    }).fetchSbtcQuote();

    expect(requests[0].url).toBe('https://leather-api.local/v1/sponsorship/quote');
  });

  test('replaces the whole base with an explicit sponsorship API URL', async () => {
    const requests = stubFetch(() => jsonResponse(quote));

    await createClient({
      environment: 'production',
      sponsorshipApiUrl: 'https://sponsor.local/api',
    }).fetchSbtcQuote();

    expect(requests[0].url).toBe('https://sponsor.local/api/quote');
  });

  test('submits the quote id and transaction as JSON', async () => {
    const requests = stubFetch(() => jsonResponse({ txid: '0xabc', transaction: '0x0102' }));

    const result = await createClient({ environment: 'production' }).submitSbtcTransaction({
      quoteId: 'quote-1',
      transaction: '0x0001',
    });

    expect(result).toEqual({ txid: '0xabc', transaction: '0x0102' });
    expect(requests[0].method).toBe('POST');
    expect(requests[0].url).toBe(`${LEATHER_API_URL_PRODUCTION}/v1/sponsorship/submit`);
    expect(requests[0].headers.get('Content-Type')).toBe('application/json');
    expect(await requests[0].json()).toEqual({ quoteId: 'quote-1', transaction: '0x0001' });
  });

  test('rejects a quote response that does not match the schema', async () => {
    stubFetch(() => jsonResponse({ ...quote, satsPerStx: 1234 }));

    await expect(createClient({ environment: 'production' }).fetchSbtcQuote()).rejects.toThrow();
  });

  test('throws a typed Leather API error carrying the error code and reason', async () => {
    stubFetch(() =>
      jsonResponse(
        { error: 'Not eligible', code: 'not_eligible', reason: 'float_low' },
        { status: 422, statusText: 'Unprocessable Entity' }
      )
    );

    const error: unknown = await createClient({ environment: 'production' })
      .submitSbtcTransaction({ quoteId: 'quote-1', transaction: '0x0001' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LeatherApiError);
    expect(error).toMatchObject({
      status: 422,
      data: { error: 'Not eligible', code: 'not_eligible', reason: 'float_low' },
    });
    expect(getLeatherSponsorshipErrorCode(error)).toBe('not_eligible');
  });

  test('ignores an unknown error code', async () => {
    stubFetch(() => jsonResponse({ error: 'Oops', code: 'teapot' }, { status: 418 }));

    const error: unknown = await createClient({ environment: 'production' })
      .fetchSbtcQuote()
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LeatherApiError);
    expect(getLeatherSponsorshipErrorCode(error)).toBeUndefined();
  });
});
