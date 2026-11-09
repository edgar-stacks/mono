import { inject, injectable } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { LEATHER_API_URL_PRODUCTION, LEATHER_API_URL_STAGING } from '@leather.io/constants';

import { Types } from '../../../inversify.types';
import type { Environment } from '../../environment';
import { leatherApiPriorities } from '../../rate-limiter/leather-rate-limiter';
import { RateLimiterService, RateLimiterType } from '../../rate-limiter/rate-limiter.service';
import { ApiRequestOptions } from '../types';
import { LeatherApiError, readLeatherApiErrorData } from './leather-api.error';

const sponsorshipQuotePath = '/v1/sponsorship/quote';
const sponsorshipSubmitPath = '/v1/sponsorship/submit';

const sbtcSponsorshipQuoteSchema = z.object({
  quoteId: z.string(),
  feeRecipientPrincipal: z.string(),
  expiresAt: z.string(),
  satsPerStx: z.string(),
  minFeeSats: z.union([z.number(), z.string()]),
  maxFeeSats: z.union([z.number(), z.string()]),
});

export type SbtcSponsorshipQuote = z.infer<typeof sbtcSponsorshipQuoteSchema>;

const sbtcSponsorshipSubmitResultSchema = z.object({
  txid: z.string(),
  transaction: z.string(),
});

export type SbtcSponsorshipSubmitResult = z.infer<typeof sbtcSponsorshipSubmitResultSchema>;

export interface SbtcSponsorshipQuoteRequest {
  network: 'mainnet' | 'testnet';
  sender: string;
}

export interface SbtcSponsorshipSubmitRequest {
  quoteId: string;
  transaction: string;
}

function getSponsorshipApiBaseUrl(env: Environment) {
  if (env.sponsorshipApiUrl) return env.sponsorshipApiUrl;
  if (env.environment === 'production') return LEATHER_API_URL_PRODUCTION;
  return env.leatherApiUrl ?? LEATHER_API_URL_STAGING;
}

@injectable()
export class LeatherSponsorshipApiClient {
  private readonly baseUrl: string;
  private readonly clientId = uuidv4();

  constructor(
    @inject(Types.Environment) env: Environment,
    private readonly rateLimiter: RateLimiterService
  ) {
    this.baseUrl = getSponsorshipApiBaseUrl(env).replace(/\/+$/, '');
  }

  async fetchSbtcSponsorshipQuote(
    request: SbtcSponsorshipQuoteRequest,
    { signal }: ApiRequestOptions = {}
  ): Promise<SbtcSponsorshipQuote> {
    const data = await this.rateLimiter.add(
      RateLimiterType.Leather,
      () => this.post(sponsorshipQuotePath, request, signal),
      { priority: leatherApiPriorities.sponsorshipQuote, signal }
    );
    return sbtcSponsorshipQuoteSchema.parse(data);
  }

  async submitSbtcSponsoredTransaction(
    request: SbtcSponsorshipSubmitRequest,
    { signal }: ApiRequestOptions = {}
  ): Promise<SbtcSponsorshipSubmitResult> {
    const data = await this.rateLimiter.add(
      RateLimiterType.Leather,
      () => this.post(sponsorshipSubmitPath, request, signal),
      { priority: leatherApiPriorities.sponsorshipSubmit, signal }
    );
    return sbtcSponsorshipSubmitResultSchema.parse(data);
  }

  private async post(path: string, body: object, signal?: AbortSignal): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': this.clientId,
      },
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
    return response.json();
  }
}
