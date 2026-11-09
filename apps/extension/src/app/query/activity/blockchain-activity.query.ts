import { type InfiniteData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  type BlockchainActivityItem,
  type BlockchainActivityViewDeps,
  createBlockchainActivityItem,
  createBlockchainActivityItems,
} from '@leather.io/features';
import type {
  AccountAddresses,
  BlockchainActivity,
  CryptoAsset,
  CryptoAssetChain,
  Money,
} from '@leather.io/models';
import {
  createBlockchainActivityByAssetIdQueryConfig,
  createBlockchainActivityByTxIdQueryConfig,
  createBlockchainActivityInfiniteQueryConfig,
} from '@leather.io/queries';
import {
  type ActivityResponse,
  type UserSettings,
  getHttpCacheService,
} from '@leather.io/services';
import { type FormatAmountOptions, getAssetId } from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import { queryClient } from '@app/common/persistence';
import { useUserSettings } from '@app/hooks/use-user-settings';

const feedPageSize = 25;
const feedRefetchInterval = 15_000;
const feedRefetchMaxPages = 2;
const activityByTxIdRefetchInterval = 10_000;
const unresolvedTxIdMaxRefetches = 4;

const activityQueryPrefixes = [
  'blockchain-activity-service--get-activity',
  'blockchain-activity-service--get-activity-infinite',
  'blockchain-activity-service--get-activity-by-asset-id',
];

export async function invalidateActivityQueries() {
  await Promise.all([
    getHttpCacheService().clear('leather-api-bitcoin-descriptor-transactions'),
    getHttpCacheService().clear('leather-api-bitcoin-address-transactions'),
  ]);
  await Promise.all(
    activityQueryPrefixes.map(prefix => queryClient.invalidateQueries({ queryKey: [prefix] }))
  );
}

function formatActivityMoney(money: Money, options?: FormatAmountOptions) {
  return formatCurrency(money, { ...options, showCurrency: false });
}

export const activityViewDeps: BlockchainActivityViewDeps = { formatMoney: formatActivityMoney };

function selectBlockchainActivityFeedItems(data: InfiniteData<ActivityResponse>) {
  return createBlockchainActivityItems(
    data.pages.flatMap(page => page.items),
    activityViewDeps
  );
}

function selectBlockchainActivityItems(activities: BlockchainActivity[]) {
  return createBlockchainActivityItems(activities, activityViewDeps);
}

function selectBlockchainActivityItem(activity: BlockchainActivity | null) {
  return activity === null ? null : createBlockchainActivityItem(activity, activityViewDeps);
}

function createFeedQueryConfig(account: AccountAddresses, settings: UserSettings) {
  return createBlockchainActivityInfiniteQueryConfig({ account, limit: feedPageSize }, settings);
}

function findFeedActivity(
  account: AccountAddresses,
  chain: CryptoAssetChain,
  txid: string,
  settings: UserSettings
) {
  const { queryKey } = createFeedQueryConfig(account, settings);
  const feed = queryClient.getQueryData<InfiniteData<ActivityResponse>>(queryKey);
  const activity = feed?.pages
    .flatMap(page => page.items)
    .find(item => item.chain === chain && item.txid === txid);
  if (!activity) return undefined;
  return { activity, dataUpdatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt };
}

export function useBlockchainActivityByAssetId(account: AccountAddresses, asset: CryptoAsset) {
  const settings = useUserSettings();

  return useQuery({
    ...createBlockchainActivityByAssetIdQueryConfig(account, getAssetId(asset), settings),
    select: selectBlockchainActivityItems,
  });
}

interface BlockchainActivityByTxId {
  item: BlockchainActivityItem | null;
  isLoading: boolean;
}

export function useBlockchainActivityByTxId(
  account: AccountAddresses,
  chain: CryptoAssetChain,
  txid: string
): BlockchainActivityByTxId {
  const settings = useUserSettings();
  const feedActivity = findFeedActivity(account, chain, txid, settings);

  const byTxIdQuery = useQuery({
    ...createBlockchainActivityByTxIdQueryConfig(account, chain, txid, settings),
    initialData: feedActivity?.activity,
    initialDataUpdatedAt: feedActivity?.dataUpdatedAt,
    refetchInterval(query) {
      const { data, dataUpdateCount } = query.state;
      if (data === null) {
        return dataUpdateCount <= unresolvedTxIdMaxRefetches
          ? activityByTxIdRefetchInterval
          : false;
      }
      return data?.status === 'pending' ? activityByTxIdRefetchInterval : false;
    },
    select: selectBlockchainActivityItem,
  });

  const feedItem = feedActivity ? selectBlockchainActivityItem(feedActivity.activity) : null;
  return { item: byTxIdQuery.data ?? feedItem, isLoading: byTxIdQuery.isLoading };
}

interface BlockchainActivityFeed {
  items: BlockchainActivityItem[];
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isRefetchError: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage(): void;
  refetch(): void;
}

interface BlockchainActivityFeedOptions {
  poll?: boolean;
}

export function useBlockchainActivityFeed(
  account: AccountAddresses,
  { poll = true }: BlockchainActivityFeedOptions = {}
): BlockchainActivityFeed {
  const settings = useUserSettings();

  const feedQuery = useInfiniteQuery({
    ...createFeedQueryConfig(account, settings),
    refetchInterval(query) {
      if (!poll) return false;
      const pageCount = query.state.data?.pages.length ?? 1;
      return pageCount <= feedRefetchMaxPages ? feedRefetchInterval : false;
    },
    select: selectBlockchainActivityFeedItems,
  });

  return {
    items: feedQuery.data ?? [],
    isLoading: feedQuery.isLoading,
    isError: feedQuery.isError,
    isSuccess: feedQuery.isSuccess,
    isRefetchError: feedQuery.isRefetchError,
    isFetchNextPageError: feedQuery.isFetchNextPageError,
    hasNextPage: feedQuery.hasNextPage,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    fetchNextPage: () => void feedQuery.fetchNextPage(),
    refetch: () => void feedQuery.refetch(),
  };
}
