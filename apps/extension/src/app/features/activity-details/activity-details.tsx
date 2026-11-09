import { useParams } from 'react-router';

import { z } from 'zod';

import type { BlockchainActivityItem } from '@leather.io/features';
import { type CryptoAssetChain, CryptoAssetChains } from '@leather.io/models';

import { useSbtcDepositOverlay } from '@app/features/activity-list/use-sbtc-deposit-activity';
import { useBlockchainActivityDetail } from '@app/query/activity/blockchain-activity.query';
import { useCurrentAccountAddresses } from '@app/services/accounts/use-account-addresses';

import { ActivityDetailsActions } from './components/activity-details-actions';
import { ActivityDetailsBalanceChanges } from './components/activity-details-balance-changes';
import { ActivityDetailsExplorerButton } from './components/activity-details-explorer-button';
import { ActivityDetailsHero } from './components/activity-details-hero';
import { ActivityDetailsLoading } from './components/activity-details-loading';
import { ActivityDetailsNotFound } from './components/activity-details-not-found';
import { ActivityDetailsRows } from './components/activity-details-rows';
import { ActivityDetailsScreen } from './components/activity-details-screen';

const activityChainSchema = z.enum(CryptoAssetChains);

interface ActivityDetailsContentProps {
  item: BlockchainActivityItem;
}

function ActivityDetailsContent({ item }: ActivityDetailsContentProps) {
  const { activity, view } = item;
  const sbtcOverlay = useSbtcDepositOverlay(view.txid);
  const overlay = view.chain === 'bitcoin' ? sbtcOverlay : undefined;

  return (
    <>
      <ActivityDetailsHero view={view} sbtcOverlay={overlay} />
      <ActivityDetailsActions activity={activity} sbtcOverlay={overlay} />
      <ActivityDetailsBalanceChanges balanceChanges={activity.balanceChanges} />
      <ActivityDetailsRows activity={activity} />
      <ActivityDetailsExplorerButton chain={view.chain} txid={view.txid} />
    </>
  );
}

interface ActivityDetailsLookupProps {
  chain: CryptoAssetChain;
  txid: string;
}

function ActivityDetailsLookup({ chain, txid }: ActivityDetailsLookupProps) {
  const account = useCurrentAccountAddresses();
  const { data: item, isLoading } = useBlockchainActivityDetail(account, chain, txid);

  if (isLoading) return <ActivityDetailsLoading />;
  if (!item) return <ActivityDetailsNotFound chain={chain} txid={txid} />;
  return <ActivityDetailsContent item={item} />;
}

export function ActivityDetails() {
  const params = useParams();
  const chain = activityChainSchema.safeParse(params.chain);
  const { txid } = params;

  return (
    <ActivityDetailsScreen>
      {chain.success && txid ? (
        <ActivityDetailsLookup key={`${chain.data}:${txid}`} chain={chain.data} txid={txid} />
      ) : (
        <ActivityDetailsNotFound />
      )}
    </ActivityDetailsScreen>
  );
}
