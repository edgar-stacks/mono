import { useCallback } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { createSbtcSponsorshipQuoteQueryConfig } from '@leather.io/queries';

import { useUserSettings } from '@app/hooks/use-user-settings';

export function useSbtcSponsorshipQuote(enabled: boolean) {
  const settings = useUserSettings();
  return useQuery({ ...createSbtcSponsorshipQuoteQueryConfig(settings), enabled });
}

export function useFetchFreshSbtcSponsorshipQuote() {
  const settings = useUserSettings();
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.fetchQuery({ ...createSbtcSponsorshipQuoteQueryConfig(settings), staleTime: 0 }),
    [queryClient, settings]
  );
}
