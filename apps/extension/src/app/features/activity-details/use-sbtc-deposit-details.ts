import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { btcAsset } from '@leather.io/constants';
import { type BlockchainActivityItem, createBlockchainActivityItem } from '@leather.io/features';
import type { CryptoAssetChain } from '@leather.io/models';
import { createBitcoinTransactionByTxIdQueryConfig } from '@leather.io/queries';

import { useUserSettings } from '@app/hooks/use-user-settings';
import { activityViewDeps } from '@app/query/activity/blockchain-activity.query';
import { useMarketData } from '@app/query/common/market-data/market-data.query';
import { useSbtcFailedDeposits, useSbtcPendingDeposits } from '@app/query/sbtc/sbtc-deposits.query';
import { useCurrentStacksAccountAddress } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

import { createSbtcDepositActivity } from '../activity-list/sbtc-deposit-activity';
import {
  type SbtcDepositOverlay,
  createSbtcDepositOverlay,
} from '../activity-list/sbtc-deposit-overlay';

interface SbtcDepositDetails {
  overlay?: SbtcDepositOverlay;
  item?: BlockchainActivityItem;
}

export function useSbtcDepositDetails(chain: CryptoAssetChain, txid: string): SbtcDepositDetails {
  const stxAddress = useCurrentStacksAccountAddress();
  const settings = useUserSettings();
  const { pendingSbtcDeposits } = useSbtcPendingDeposits(stxAddress);
  const { failedSbtcDeposits } = useSbtcFailedDeposits(stxAddress);
  const btcMarketData = useMarketData(btcAsset);

  const deposit =
    chain === 'bitcoin'
      ? [...pendingSbtcDeposits, ...failedSbtcDeposits].find(
          candidate => candidate.bitcoinTxid === txid
        )
      : undefined;

  const { data: fundingTx = null } = useQuery({
    ...createBitcoinTransactionByTxIdQueryConfig(txid, settings),
    enabled: !!deposit,
  });

  const marketData = btcMarketData.state === 'success' ? btcMarketData.value : undefined;

  const item = useMemo(
    () =>
      deposit && fundingTx
        ? createBlockchainActivityItem(
            createSbtcDepositActivity(deposit, fundingTx, marketData),
            activityViewDeps
          )
        : undefined,
    [deposit, fundingTx, marketData]
  );

  const overlay = deposit ? createSbtcDepositOverlay(deposit.status) : undefined;

  return { ...(overlay ? { overlay } : {}), ...(item ? { item } : {}) };
}
