import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSbtcSponsorshipQuoteQueryConfig,
  createSubmitSbtcSponsoredTransactionMutationConfig,
} from '@leather.io/queries';

import { isSbtcSponsorshipQuoteExpired } from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';

export function useSbtcSponsorshipQuote(enabled: boolean) {
  return useQuery({ ...createSbtcSponsorshipQuoteQueryConfig(), enabled });
}

export function useFetchSbtcSponsorshipQuote() {
  const queryClient = useQueryClient();

  return useCallback(
    async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      const config = createSbtcSponsorshipQuoteQueryConfig();
      if (!forceRefresh) {
        const quote = await queryClient.fetchQuery(config);
        if (!isSbtcSponsorshipQuoteExpired(quote.expiresAt)) return quote;
      }
      return queryClient.fetchQuery({ ...config, staleTime: 0 });
    },
    [queryClient]
  );
}

export function useSubmitSbtcSponsoredTransaction() {
  return useMutation(createSubmitSbtcSponsoredTransactionMutationConfig());
}
