import { useLocation, useNavigate, useParams } from 'react-router';

import { ActivitySelectors } from '@tests/selectors/activity.selectors';
import { z } from 'zod';

import { type CryptoAssetChain, CryptoAssetChains } from '@leather.io/models';

import { RouteUrls } from '@shared/route-urls';

import { DetailsHeader } from '@app/components/details/details-header';
import { DetailsScreen } from '@app/components/details/details-screen';
import { useSbtcDepositByTxid } from '@app/features/activity-list/use-sbtc-deposit-activity';
import { useBlockchainActivityByTxId } from '@app/query/activity/blockchain-activity.query';
import { useCurrentAccountAddresses } from '@app/services/accounts/use-account-addresses';

import { ActivityDetailsContent } from './activity-details-content';
import { ActivityDetailsLoading } from './activity-details-loading';
import { ActivityDetailsNotFound } from './activity-details-not-found';

const activityChainSchema = z.enum([CryptoAssetChains.bitcoin, CryptoAssetChains.stacks]);

function useActivityDetailsBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.key !== 'default';
  return () => void (canGoBack ? navigate(-1) : navigate(RouteUrls.Activity));
}

interface ActivityDetailsLookupProps {
  chain: CryptoAssetChain;
  txid: string;
}

function ActivityDetailsLookup({ chain, txid }: ActivityDetailsLookupProps) {
  const account = useCurrentAccountAddresses();
  const lookup = useBlockchainActivityByTxId(account, chain, txid);
  const sbtcDeposit = useSbtcDepositByTxid(chain === 'bitcoin' ? txid : undefined);
  const item = lookup.item ?? sbtcDeposit.item;

  if (item) return <ActivityDetailsContent item={item} sbtcOverlay={sbtcDeposit.overlay} />;
  if (lookup.isLoading) return <ActivityDetailsLoading />;
  return <ActivityDetailsNotFound chain={chain} txid={txid} />;
}

export function ActivityDetails() {
  const { chain: chainParam, txid } = useParams();
  const parsedChain = activityChainSchema.safeParse(chainParam);
  const onBack = useActivityDetailsBack();

  return (
    <DetailsScreen
      header={
        <DetailsHeader
          title="Transaction"
          onBack={onBack}
          backTestId={ActivitySelectors.ActivityDetailsBackButton}
          titleTestId={ActivitySelectors.ActivityDetailsTitle}
        />
      }
      testId={ActivitySelectors.ActivityDetails}
    >
      {parsedChain.success && txid ? (
        <ActivityDetailsLookup chain={parsedChain.data} txid={txid} />
      ) : (
        <ActivityDetailsNotFound />
      )}
    </DetailsScreen>
  );
}
