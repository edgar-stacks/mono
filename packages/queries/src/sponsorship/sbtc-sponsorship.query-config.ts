import type {
  QueryFunctionContext,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

import {
  type SbtcSponsorshipQuote,
  type SbtcSponsorshipSubmitRequest,
  type SbtcSponsorshipSubmitResponse,
  getLeatherSponsorshipApiClient,
} from '@leather.io/services';
import { oneMinInMs } from '@leather.io/utils';

const sbtcSponsorshipQuoteStaleTime = 15_000;

export function createSbtcSponsorshipQuoteQueryConfig() {
  return {
    queryKey: ['leather-sponsorship-api--sbtc-quote'],
    queryFn: ({ signal }: QueryFunctionContext) =>
      getLeatherSponsorshipApiClient().fetchSbtcQuote({ signal }),
    staleTime: sbtcSponsorshipQuoteStaleTime,
    gcTime: oneMinInMs,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { persist: false },
  } satisfies UseQueryOptions<SbtcSponsorshipQuote>;
}

export function createSubmitSbtcSponsoredTransactionMutationConfig() {
  return {
    mutationKey: ['leather-sponsorship-api--submit-sbtc-transaction'],
    mutationFn: (request: SbtcSponsorshipSubmitRequest) =>
      getLeatherSponsorshipApiClient().submitSbtcTransaction(request),
  } satisfies UseMutationOptions<
    SbtcSponsorshipSubmitResponse,
    Error,
    SbtcSponsorshipSubmitRequest
  >;
}
