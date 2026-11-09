import type { QueryFunctionContext, UseQueryOptions } from '@tanstack/react-query';

import {
  type SbtcSponsorshipQuote,
  type SbtcSponsorshipQuoteRequest,
  type UserSettings,
  getLeatherSponsorshipApiClient,
} from '@leather.io/services';
import { oneMinInMs } from '@leather.io/utils';

import { createServiceQueryKey } from '../shared/query-key.factory';

const sbtcSponsorshipQuoteStaleTimeMs = 15_000;

export function createSbtcSponsorshipQuoteQueryKey(
  request: SbtcSponsorshipQuoteRequest,
  settings: UserSettings
) {
  return createServiceQueryKey(
    'leather-sponsorship-api-client--get-sbtc-quote',
    [request.sender, request.nonce],
    settings
  );
}

interface CreateSbtcSponsorshipQuoteQueryConfigArgs {
  request: SbtcSponsorshipQuoteRequest;
  settings: UserSettings;
  enabled?: boolean;
}

export function createSbtcSponsorshipQuoteQueryConfig({
  request,
  settings,
  enabled = true,
}: CreateSbtcSponsorshipQuoteQueryConfigArgs) {
  return {
    enabled: enabled && !!request.sender,
    queryKey: createSbtcSponsorshipQuoteQueryKey(request, settings),
    queryFn: ({ signal }: QueryFunctionContext) =>
      getLeatherSponsorshipApiClient().fetchSbtcQuote(request, { signal }),
    staleTime: sbtcSponsorshipQuoteStaleTimeMs,
    gcTime: oneMinInMs,
    retry: false,
    meta: { persist: false },
  } satisfies UseQueryOptions<SbtcSponsorshipQuote>;
}
