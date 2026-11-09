import { useCallback, useMemo } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSbtcSponsorshipQuoteQueryConfig,
  createSubmitSbtcSponsoredTransactionMutationConfig,
} from '@leather.io/queries';
import type { SbtcSponsorshipQuoteRequest } from '@leather.io/services';

import { useUserSettings } from '@app/hooks/use-user-settings';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';

function useSbtcSponsorshipQuoteRequest(): SbtcSponsorshipQuoteRequest {
  const network = useCurrentNetwork();
  const sender = useCurrentStacksAccountAddress();
  const mode = network.chain.bitcoin.mode === 'mainnet' ? 'mainnet' : 'testnet';
  return useMemo(() => ({ network: mode, sender }), [mode, sender]);
}

export function useSbtcSponsorshipQuote(enabled: boolean) {
  const settings = useUserSettings();
  const request = useSbtcSponsorshipQuoteRequest();
  return useQuery({
    ...createSbtcSponsorshipQuoteQueryConfig(request, settings),
    enabled: enabled && !!request.sender,
  });
}

export function useFetchFreshSbtcSponsorshipQuote() {
  const queryClient = useQueryClient();
  const settings = useUserSettings();
  const request = useSbtcSponsorshipQuoteRequest();
  return useCallback(
    () =>
      queryClient.fetchQuery({
        ...createSbtcSponsorshipQuoteQueryConfig(request, settings),
        staleTime: 0,
      }),
    [queryClient, request, settings]
  );
}

export function useSubmitSbtcSponsoredTransaction() {
  return useMutation(createSubmitSbtcSponsoredTransactionMutationConfig());
}
