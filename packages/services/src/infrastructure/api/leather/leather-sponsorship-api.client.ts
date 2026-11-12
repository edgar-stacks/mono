import { inject, injectable } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { LEATHER_API_URL_PRODUCTION, LEATHER_API_URL_STAGING } from '@leather.io/constants';

import { Types } from '../../../inversify.types';
import type { Environment } from '../../environment';
import { leatherApiPriorities } from '../../rate-limiter/leather-rate-limiter';
import { RateLimiterService, RateLimiterType } from '../../rate-limiter/rate-limiter.service';
import { LeatherApiError, readLeatherApiErrorData } from './leather-api.error';

const sponsorshipPath = '/v1/sponsorship';

const sbtcSponsorshipQuoteSchema = z.object({
  quoteId: z.string(),
  feeRecipientPrincipal: z.string(),
  expiresAt: z.string(),
  satsPerStx: z.string(),
  minFeeSats: z.coerce.number(),
  maxFeeSats: z.coerce.number(),
});

export type SbtcSponsorshipQuote = z.infer<typeof sbtcSponsorshipQuoteSchema>;

const sbtcSponsorshipSubmitResponseSchema = z.object({
  txid: z.string(),
  transaction: z.string(),
});

export type SbtcSponsorshipSubmitResponse = z.infer<typeof sbtcSponsorshipSubmitResponseSchema>;

export interface SbtcSponsorshipSubmitRequest {
  quoteId: string;
  transaction: string;
}

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

  async fetchSbtcQuote(signal?: AbortSignal): Promise<SbtcSponsorshipQuote> {
    const body = await this.rateLimiter.add(
      RateLimiterType.Leather,
      () => this.post('/quote', undefined, signal),
      { priority: leatherApiPriorities.sponsorshipQuote, signal }
    );
    return sbtcSponsorshipQuoteSchema.parse(body);
  }

  async submitSbtcTransaction(
    request: SbtcSponsorshipSubmitRequest,
    signal?: AbortSignal
  ): Promise<SbtcSponsorshipSubmitResponse> {
    const body = await this.rateLimiter.add(
      RateLimiterType.Leather,
      () => this.post('/submit', request, signal),
      { priority: leatherApiPriorities.sponsorshipSubmit, signal }
    );
    return sbtcSponsorshipSubmitResponseSchema.parse(body);
  }

  private async post(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
    const headers: Record<string, string> = { 'X-Client-ID': this.clientId };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      throw new LeatherApiError(
        response.url,
        response.status,
        response.statusText,
        await readLeatherApiErrorData(response)
      );
    }
    const data: unknown = await response.json();
    return data;
  }
}
