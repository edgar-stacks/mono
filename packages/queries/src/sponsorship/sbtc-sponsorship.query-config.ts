import type {
  QueryFunctionContext,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

import {
  type SbtcSponsorshipQuote,
  type SbtcSponsorshipQuoteRequest,
  type SbtcSponsorshipSubmitRequest,
  type SbtcSponsorshipSubmitResult,
  type UserSettings,
  getLeatherSponsorshipApiClient,
} from '@leather.io/services';
import { oneMinInMs, secondsInMs } from '@leather.io/utils';

import { createServiceQueryKey } from '../shared/query-key.factory';

const sbtcSponsorshipQuoteStaleTime = secondsInMs(15);

export function createSbtcSponsorshipQuoteQueryKey(
  request: SbtcSponsorshipQuoteRequest,
  settings: UserSettings
) {
  return createServiceQueryKey(
    'leather-sponsorship-api-client--get-sbtc-sponsorship-quote',
    [request.network, request.sender],
    settings
  );
}

export function createSbtcSponsorshipQuoteQueryConfig(
  request: SbtcSponsorshipQuoteRequest,
  settings: UserSettings
) {
  return {
    queryKey: createSbtcSponsorshipQuoteQueryKey(request, settings),
    queryFn: ({ signal }: QueryFunctionContext) =>
      getLeatherSponsorshipApiClient().fetchSbtcSponsorshipQuote(request, { signal }),
    staleTime: sbtcSponsorshipQuoteStaleTime,
    gcTime: oneMinInMs,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { persist: false },
  } satisfies UseQueryOptions<SbtcSponsorshipQuote>;
}

export function createSubmitSbtcSponsoredTransactionMutationConfig() {
  return {
    mutationKey: ['leather-sponsorship-api-client--submit-sbtc-sponsored-transaction'],
    mutationFn: (request: SbtcSponsorshipSubmitRequest) =>
      getLeatherSponsorshipApiClient().submitSbtcSponsoredTransaction(request),
  } satisfies UseMutationOptions<SbtcSponsorshipSubmitResult, Error, SbtcSponsorshipSubmitRequest>;
}
