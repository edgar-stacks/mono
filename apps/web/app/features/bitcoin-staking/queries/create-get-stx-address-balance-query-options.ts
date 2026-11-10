import { type QueryFunctionContext, skipToken } from '@tanstack/react-query';
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
    queryKey: ['get-stx-address-balance', address, network],
    queryFn: address
      ? ({ signal }: QueryFunctionContext) => client.getStxAddressBalance(address, signal)
      : skipToken,
    ...queryOptions,
  } as const;
}
