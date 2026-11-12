import type { ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { ActivitySelectors } from '@tests/selectors/activity.selectors';

import { type CryptoAssetChain, CryptoAssetChains } from '@leather.io/models';

import { RouteUrls } from '@shared/route-urls';

import { DetailsHeader } from '@app/components/details/details-header';
import { DetailsScreen } from '@app/components/details/details-screen';
import { useBlockchainActivityByTxId } from '@app/query/activity/blockchain-activity.query';
import { useCurrentAccountAddresses } from '@app/services/accounts/use-account-addresses';

import { ActivityBalanceChanges } from './components/activity-balance-changes';
import { ActivityDetailsActions } from './components/activity-details-actions';
import { ActivityDetailsExplorerButton } from './components/activity-details-explorer-button';
import { ActivityDetailsHero } from './components/activity-details-hero';
import { ActivityDetailsLoading } from './components/activity-details-loading';
import { ActivityDetailsNotFound } from './components/activity-details-not-found';
import { ActivityTransactionDetails } from './components/activity-transaction-details';
import { useSbtcDepositDetails } from './use-sbtc-deposit-details';

const initialLocationKey = 'default';

function parseChain(chain: string | undefined): CryptoAssetChain | undefined {
  if (chain === CryptoAssetChains.bitcoin) return CryptoAssetChains.bitcoin;
  if (chain === CryptoAssetChains.stacks) return CryptoAssetChains.stacks;
  return undefined;
}

interface ActivityDetailsLayoutProps {
  children: ReactNode;
}

function ActivityDetailsLayout({ children }: ActivityDetailsLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function onBack() {
    if (location.key === initialLocationKey) {
      void navigate(RouteUrls.Activity);
      return;
    }
    void navigate(-1);
  }

  return (
    <DetailsScreen
      header={
        <DetailsHeader
          title="Transaction"
          onBack={onBack}
          backTestId={ActivitySelectors.ActivityDetailsBack}
          titleTestId={ActivitySelectors.ActivityDetailsTitle}
        />
      }
      testId={ActivitySelectors.ActivityDetails}
    >
      {children}
    </DetailsScreen>
  );
}

interface ActivityDetailsContentProps {
  chain: CryptoAssetChain;
  txid: string;
}

function ActivityDetailsContent({ chain, txid }: ActivityDetailsContentProps) {
  const account = useCurrentAccountAddresses();
  const activityQuery = useBlockchainActivityByTxId(account, chain, txid);
  const sbtcDeposit = useSbtcDepositDetails(chain, txid);
  const item = activityQuery.data ?? sbtcDeposit.item;

  if (!item) {
    const isFirstLookupLoading = activityQuery.isLoading && activityQuery.failureCount === 0;
    if (isFirstLookupLoading) return <ActivityDetailsLoading />;
    return <ActivityDetailsNotFound chain={chain} txid={txid} />;
  }

  const { activity, view } = item;

  return (
    <>
      <ActivityDetailsHero view={view} sbtcOverlay={sbtcDeposit.overlay} />
      <ActivityDetailsActions activity={activity} reclaimUrl={sbtcDeposit.overlay?.reclaimUrl} />
      <ActivityBalanceChanges balanceChanges={activity.balanceChanges} />
      <ActivityTransactionDetails activity={activity} />
      <ActivityDetailsExplorerButton chain={chain} txid={txid} />
    </>
  );
}

export function ActivityDetails() {
  const params = useParams();
  const chain = parseChain(params.chain);
  const { txid } = params;

  return (
    <ActivityDetailsLayout>
      {chain && txid ? (
        <ActivityDetailsContent key={`${chain}:${txid}`} chain={chain} txid={txid} />
      ) : (
        <ActivityDetailsNotFound chain={chain} txid={txid} />
      )}
    </ActivityDetailsLayout>
  );
}
