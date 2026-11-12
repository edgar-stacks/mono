import {
  type QueryFunctionContext,
  type UseQueryOptions,
  infiniteQueryOptions,
  skipToken,
} from '@tanstack/react-query';

import type { AccountAddresses, BlockchainActivity, CryptoAssetChain } from '@leather.io/models';
import {
  type ActivityRequest,
  type ActivityResponse,
  type UserSettings,
  getBlockchainActivityService,
} from '@leather.io/services';

import { createServiceQueryKey } from '../shared/query-key.factory';
import { activityQueryOptions } from '../shared/query-options';

export function createBlockchainActivityQueryKey(request: ActivityRequest, settings: UserSettings) {
  return createServiceQueryKey('blockchain-activity-service--get-activity', [request], settings);
}

export function createBlockchainActivityQueryConfig(
  request: ActivityRequest,
  settings: UserSettings
) {
  return {
    queryKey: createBlockchainActivityQueryKey(request, settings),
    queryFn: ({ signal }: QueryFunctionContext) =>
      getBlockchainActivityService().getActivity(request, signal),
    ...activityQueryOptions,
  } satisfies UseQueryOptions<ActivityResponse>;
}

export function createBlockchainActivityByTxIdQueryKey(
  account: AccountAddresses,
  chain: CryptoAssetChain,
  txid: string | undefined,
  settings: UserSettings
) {
  return createServiceQueryKey(
    'blockchain-activity-service--get-activity-by-tx-id',
    [account, chain, txid],
    settings
  );
}

export function createBlockchainActivityByTxIdQueryConfig(
  account: AccountAddresses,
  chain: CryptoAssetChain,
  txid: string | undefined,
  settings: UserSettings
) {
  return {
    queryKey: createBlockchainActivityByTxIdQueryKey(account, chain, txid, settings),
    queryFn: txid
      ? ({ signal }: QueryFunctionContext) =>
          getBlockchainActivityService().getActivityByTxId(account, chain, txid, signal)
      : skipToken,
    ...activityQueryOptions,
  } satisfies UseQueryOptions<BlockchainActivity | null>;
}

type BlockchainActivityFeedRequest = Omit<ActivityRequest, 'cursor'>;

export function createBlockchainActivityInfiniteQueryKey(
  request: BlockchainActivityFeedRequest,
  settings: UserSettings
) {
  return createServiceQueryKey(
    'blockchain-activity-service--get-activity-infinite',
    [request],
    settings
  );
}

export function createBlockchainActivityInfiniteQueryConfig(
  request: BlockchainActivityFeedRequest,
  settings: UserSettings
) {
  const initialCursor: ActivityResponse['nextCursor'] = null;
  return infiniteQueryOptions({
    queryKey: createBlockchainActivityInfiniteQueryKey(request, settings),
    queryFn: ({ pageParam, signal }) =>
      getBlockchainActivityService().getActivity(
        { ...request, cursor: pageParam ?? undefined },
        signal
      ),
    initialPageParam: initialCursor,
    getNextPageParam: (lastPage: ActivityResponse) => lastPage.nextCursor,
    ...activityQueryOptions,
  });
}
