import { useMutation, useQuery } from '@tanstack/react-query';

import {
  createSbtcSponsorshipQuoteQueryConfig,
  createSubmitSbtcSponsoredTransactionMutationConfig,
} from '@leather.io/queries';
import type { SbtcSponsorshipQuoteRequest, UserSettings } from '@leather.io/services';

import { queryClient } from '@app/common/persistence';
import { useUserSettings } from '@app/hooks/use-user-settings';

export function useSbtcSponsorshipQuoteQuery(
  request: SbtcSponsorshipQuoteRequest,
  enabled: boolean
) {
  const settings = useUserSettings();
  return useQuery(createSbtcSponsorshipQuoteQueryConfig({ request, settings, enabled }));
}

export function fetchFreshSbtcSponsorshipQuote(
  request: SbtcSponsorshipQuoteRequest,
  settings: UserSettings
) {
  return queryClient.fetchQuery({
    ...createSbtcSponsorshipQuoteQueryConfig({ request, settings }),
    staleTime: 0,
  });
}

export function useSubmitSbtcSponsoredTransactionMutation() {
  return useMutation(createSubmitSbtcSponsoredTransactionMutationConfig());
}
