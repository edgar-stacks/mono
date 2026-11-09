import { inject, injectable } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { LEATHER_API_URL_PRODUCTION, LEATHER_API_URL_STAGING } from '@leather.io/constants';

import { Types } from '../../../inversify.types';
import type { Environment } from '../../environment';
import { leatherApiPriorities } from '../../rate-limiter/leather-rate-limiter';
import { RateLimiterService, RateLimiterType } from '../../rate-limiter/rate-limiter.service';
import type { ApiRequestOptions } from '../types';
import { LeatherApiError, readLeatherApiErrorData } from './leather-api.error';

const sbtcSponsorshipQuoteSchema = z.object({
  quoteId: z.string(),
  feeRecipientPrincipal: z.string(),
  expiresAt: z.string(),
  satsPerStx: z.string(),
  minFeeSats: z.union([z.number(), z.string()]).transform(String),
  maxFeeSats: z.union([z.number(), z.string()]).transform(String),
});
export type SbtcSponsorshipQuote = z.output<typeof sbtcSponsorshipQuoteSchema>;

const sbtcSponsorshipSubmitResponseSchema = z.object({
  txid: z.string(),
  transaction: z.string(),
});
export type SbtcSponsorshipSubmitResponse = z.infer<typeof sbtcSponsorshipSubmitResponseSchema>;

export interface SbtcSponsorshipQuoteRequest {
  network: 'mainnet' | 'testnet';
  sender: string;
  nonce: number;
}

export interface SbtcSponsorshipSubmitRequest {
  quoteId: string;
  transaction: string;
}

function getSponsorshipApiBaseUrl(env: Environment) {
  if (env.sponsorshipApiUrl) return env.sponsorshipApiUrl;
  return env.environment === 'production' ? LEATHER_API_URL_PRODUCTION : LEATHER_API_URL_STAGING;
}

@injectable()
export class LeatherSponsorshipApiClient {
  private readonly baseUrl: string;
  private readonly clientId = uuidv4();

  constructor(
    @inject(Types.Environment) env: Environment,
    private readonly rateLimiter: RateLimiterService
  ) {
    this.baseUrl = getSponsorshipApiBaseUrl(env);
  }

  async fetchSbtcQuote(
    body: SbtcSponsorshipQuoteRequest,
    { signal }: ApiRequestOptions = {}
  ): Promise<SbtcSponsorshipQuote> {
    const data = await this.post('/v1/sponsorship/quote', body, signal);
    return sbtcSponsorshipQuoteSchema.parse(data);
  }

  async submitSponsoredTransaction(
    body: SbtcSponsorshipSubmitRequest,
    { signal }: ApiRequestOptions = {}
  ): Promise<SbtcSponsorshipSubmitResponse> {
    const data = await this.post('/v1/sponsorship/submit', body, signal);
    return sbtcSponsorshipSubmitResponseSchema.parse(data);
  }

  private async post(path: string, body: object, signal?: AbortSignal): Promise<unknown> {
    return this.rateLimiter.add(
      RateLimiterType.Leather,
      async () => {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Client-ID': this.clientId },
          body: JSON.stringify(body),
          signal,
        });
        if (!response.ok) {
          throw new LeatherApiError(
            response.url || `${this.baseUrl}${path}`,
            response.status,
            response.statusText,
            await readLeatherApiErrorData(response)
          );
        }
        const data: unknown = await response.json();
        return data;
      },
      { priority: leatherApiPriorities.sponsorship, signal }
    );
  }
}
