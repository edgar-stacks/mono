import type { QueryFunctionContext } from '@tanstack/react-query';
import type { StacksApiClient } from '~/utils/stacks-api-client';

import { oneWeekInMs } from '@leather.io/utils';

const staleTime = 1 * 60 * 1000;

const queryOptions = {
  staleTime,
  gcTime: oneWeekInMs,
  refetchInterval: staleTime,
} as const;

interface CreateGetStxAddressBalanceQueryOptionsArgs {
  address: string | undefined;
  client: Pick<StacksApiClient, 'getStxAddressBalance'>;
  network: string;
}

export function createGetStxAddressBalanceQueryOptions({
  address,
  client,
  network,
}: CreateGetStxAddressBalanceQueryOptionsArgs) {
  return {
    enabled: !!address,
    queryKey: ['get-stx-address-balance', address, network],
    async queryFn({ signal }: QueryFunctionContext) {
      if (!address) return null;
      return client.getStxAddressBalance(address, signal);
    },
    ...queryOptions,
  } as const;
}
