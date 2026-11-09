import { inject, injectable } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { LEATHER_API_URL_PRODUCTION, LEATHER_API_URL_STAGING } from '@leather.io/constants';

import { Types } from '../../../inversify.types';
import type { Environment } from '../../environment';
import { leatherApiPriorities } from '../../rate-limiter/leather-rate-limiter';
import { RateLimiterService, RateLimiterType } from '../../rate-limiter/rate-limiter.service';
import { LeatherApiError, readLeatherApiErrorData } from './leather-api.error';

export const leatherSponsorshipErrorCodes = [
  'quote_expired',
  'not_eligible',
  'stale_nonce',
  'broadcast_failed',
  'upstream_unavailable',
  'rate_limited',
] as const;
export type LeatherSponsorshipErrorCode = (typeof leatherSponsorshipErrorCodes)[number];

const sponsorshipQuoteSchema = z.object({
  quoteId: z.string(),
  feeRecipientPrincipal: z.string(),
  expiresAt: z.string(),
  satsPerStx: z.string(),
  minFeeSats: z.number(),
  maxFeeSats: z.number(),
});
export type LeatherSponsorshipQuote = z.infer<typeof sponsorshipQuoteSchema>;

const sponsorshipSubmitResponseSchema = z.object({
  txid: z.string(),
  transaction: z.string(),
});
export type LeatherSponsorshipSubmitResponse = z.infer<typeof sponsorshipSubmitResponseSchema>;

export interface LeatherSponsorshipSubmitRequest {
  quoteId: string;
  transaction: string;
}

const sponsorshipPath = '/v1/sponsorship';

function getSponsorshipBaseUrl(env: Environment) {
  if (env.sponsorshipApiUrl) return env.sponsorshipApiUrl;
  const leatherApiUrl =
    env.environment === 'production'
      ? LEATHER_API_URL_PRODUCTION
      : (env.leatherApiUrl ?? LEATHER_API_URL_STAGING);
  return `${leatherApiUrl}${sponsorshipPath}`;
}

@injectable()
export class LeatherSponsorshipApiClient {
  private readonly baseUrl: string;
  private readonly clientId = uuidv4();

  constructor(
    @inject(Types.Environment) env: Environment,
    private readonly rateLimiter: RateLimiterService
  ) {
    this.baseUrl = getSponsorshipBaseUrl(env);
  }

  async fetchQuote({ signal }: { signal?: AbortSignal } = {}): Promise<LeatherSponsorshipQuote> {
    const body = await this.rateLimiter.add(
      RateLimiterType.Leather,
      () => this.post('/quote', undefined, signal),
      { priority: leatherApiPriorities.sponsorshipQuote, signal }
    );
    return sponsorshipQuoteSchema.parse(body);
  }

  async submit(
    request: LeatherSponsorshipSubmitRequest,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<LeatherSponsorshipSubmitResponse> {
    const body = await this.rateLimiter.add(
      RateLimiterType.Leather,
      () => this.post('/submit', request, signal),
      { priority: leatherApiPriorities.sponsorshipSubmit, signal }
    );
    return sponsorshipSubmitResponseSchema.parse(body);
  }

  private async post(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
    const headers: Record<string, string> = { 'X-Client-ID': this.clientId };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(
      new Request(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      })
    );
    if (!response.ok) {
      throw new LeatherApiError(
        response.url || `${this.baseUrl}${path}`,
        response.status,
        response.statusText,
        await readLeatherApiErrorData(response)
      );
    }
    const responseBody: unknown = await response.json();
    return responseBody;
  }
}
