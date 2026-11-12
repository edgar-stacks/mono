import type {
  QueryFunctionContext,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

import {
  type SbtcSponsorshipQuote,
  type SbtcSponsorshipSubmitRequest,
  type SbtcSponsorshipSubmitResponse,
  type UserSettings,
  getLeatherSponsorshipApiClient,
} from '@leather.io/services';
import { oneMinInMs } from '@leather.io/utils';

import { createServiceQueryKey } from '../shared/query-key.factory';

const sbtcSponsorshipQuoteStaleTime = 15_000;

export function createSbtcSponsorshipQuoteQueryKey(settings: UserSettings) {
  return createServiceQueryKey('leather-sponsorship-api-client--get-sbtc-quote', [], settings);
}

export function createSbtcSponsorshipQuoteQueryConfig(settings: UserSettings) {
  return {
    queryKey: createSbtcSponsorshipQuoteQueryKey(settings),
    queryFn: ({ signal }: QueryFunctionContext) =>
      getLeatherSponsorshipApiClient().fetchSbtcQuote(signal),
    staleTime: sbtcSponsorshipQuoteStaleTime,
    gcTime: oneMinInMs,
    retry: false,
    meta: { persist: false },
  } satisfies UseQueryOptions<SbtcSponsorshipQuote>;
}

export function createSubmitSbtcSponsoredTransactionMutationConfig() {
  return {
    mutationKey: ['leather-sponsorship-api-client--submit-sbtc-transaction'],
    mutationFn: (request: SbtcSponsorshipSubmitRequest) =>
      getLeatherSponsorshipApiClient().submitSbtcTransaction(request),
  } satisfies UseMutationOptions<
    SbtcSponsorshipSubmitResponse,
    Error,
    SbtcSponsorshipSubmitRequest
  >;
}
