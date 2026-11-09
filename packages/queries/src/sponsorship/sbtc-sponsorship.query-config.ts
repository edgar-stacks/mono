import type {
  QueryFunctionContext,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

import {
  type LeatherSponsorshipQuote,
  type LeatherSponsorshipSubmitRequest,
  type LeatherSponsorshipSubmitResponse,
  type UserSettings,
  getLeatherSponsorshipApiClient,
} from '@leather.io/services';
import { oneMinInMs } from '@leather.io/utils';

import { createServiceQueryKey } from '../shared/query-key.factory';

const sbtcSponsorshipQuoteStaleTimeMs = 15_000;

export function createSbtcSponsorshipQuoteQueryKey(settings: UserSettings) {
  return createServiceQueryKey('leather-sponsorship-api--get-sbtc-quote', [], settings);
}

export function createSbtcSponsorshipQuoteQueryConfig(settings: UserSettings) {
  return {
    queryKey: createSbtcSponsorshipQuoteQueryKey(settings),
    queryFn: ({ signal }: QueryFunctionContext) =>
      getLeatherSponsorshipApiClient().fetchQuote({ signal }),
    staleTime: sbtcSponsorshipQuoteStaleTimeMs,
    gcTime: oneMinInMs,
    retry: false,
    meta: { persist: false },
  } satisfies UseQueryOptions<LeatherSponsorshipQuote>;
}

export function createSbtcSponsorshipSubmitMutationConfig() {
  return {
    mutationKey: ['leather-sponsorship-api--submit-sbtc-transfer'],
    mutationFn: (request: LeatherSponsorshipSubmitRequest) =>
      getLeatherSponsorshipApiClient().submit(request),
  } satisfies UseMutationOptions<
    LeatherSponsorshipSubmitResponse,
    Error,
    LeatherSponsorshipSubmitRequest
  >;
}
