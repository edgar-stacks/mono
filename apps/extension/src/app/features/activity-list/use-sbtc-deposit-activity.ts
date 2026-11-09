import { useMemo } from 'react';

import { type UseQueryResult, useQueries } from '@tanstack/react-query';

import { btcAsset } from '@leather.io/constants';
import { type BlockchainActivityItem, createBlockchainActivityItem } from '@leather.io/features';
import type { BitcoinTransaction } from '@leather.io/models';
import { createBitcoinTransactionByTxIdQueryConfig } from '@leather.io/queries';

import { useUserSettings } from '@app/hooks/use-user-settings';
import { activityViewDeps } from '@app/query/activity/blockchain-activity.query';
import { useMarketData } from '@app/query/common/market-data/market-data.query';
import {
  type SbtcDeposit,
  useSbtcFailedDeposits,
  useSbtcPendingDeposits,
} from '@app/query/sbtc/sbtc-deposits.query';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

import { createSbtcDepositActivity } from './sbtc-deposit-activity';
import { type SbtcDepositOverlay, createSbtcDepositOverlay } from './sbtc-deposit-overlay';

interface SbtcDepositActivity {
  overlays: ReadonlyMap<string, SbtcDepositOverlay>;
  standaloneItems: BlockchainActivityItem[];
}

function combineFundingTxs(results: UseQueryResult<BitcoinTransaction | null>[]) {
  return { fundingTxs: results.map(result => result.data ?? null) };
}

function useSbtcDeposits() {
  const stxAddress = useCurrentStacksAccountAddress();
  const { pendingSbtcDeposits } = useSbtcPendingDeposits(stxAddress);
  const { failedSbtcDeposits } = useSbtcFailedDeposits(stxAddress);

  return useMemo(
    () => [...pendingSbtcDeposits, ...failedSbtcDeposits],
    [pendingSbtcDeposits, failedSbtcDeposits]
  );
}

function createSbtcDepositOverlays(deposits: SbtcDeposit[]) {
  const map = new Map<string, SbtcDepositOverlay>();
  for (const deposit of deposits) {
    const overlay = createSbtcDepositOverlay(deposit.status);
    if (overlay) map.set(deposit.bitcoinTxid, overlay);
  }
  return map;
}

export function useSbtcDepositOverlay(txid: string): SbtcDepositOverlay | undefined {
  const deposits = useSbtcDeposits();
  return useMemo(() => createSbtcDepositOverlays(deposits).get(txid), [deposits, txid]);
}

export function useSbtcDepositActivity(feedTxids: ReadonlySet<string>): SbtcDepositActivity {
  const settings = useUserSettings();
  const btcMarketData = useMarketData(btcAsset);
  const deposits = useSbtcDeposits();

  const unmatchedDeposits = useMemo(
    () => deposits.filter(deposit => !feedTxids.has(deposit.bitcoinTxid)),
    [deposits, feedTxids]
  );

  const { fundingTxs } = useQueries({
    queries: unmatchedDeposits.map(deposit =>
      createBitcoinTransactionByTxIdQueryConfig(deposit.bitcoinTxid, settings)
    ),
    combine: combineFundingTxs,
  });

  const marketData = btcMarketData.state === 'success' ? btcMarketData.value : undefined;

  const overlays = useMemo(() => createSbtcDepositOverlays(deposits), [deposits]);

  const standaloneItems = useMemo(
    () =>
      unmatchedDeposits.flatMap((deposit, index) => {
        const fundingTx = fundingTxs[index] ?? null;
        if (!fundingTx) return [];
        return [
          createBlockchainActivityItem(
            createSbtcDepositActivity(deposit, fundingTx, marketData),
            activityViewDeps
          ),
        ];
      }),
    [unmatchedDeposits, fundingTxs, marketData]
  );

  return { overlays, standaloneItems };
}
