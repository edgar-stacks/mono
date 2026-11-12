import { useLocation, useNavigate } from 'react-router';

import { Flex } from 'leather-styles/jsx';

import type { BlockchainActivity } from '@leather.io/models';

import { RouteUrls } from '@shared/route-urls';

import { useStacksTransactionActionNavigate } from '@app/common/hooks/use-stacks-transaction-action-navigate';
import { StacksTransactionActionType } from '@app/common/transactions/stacks/transaction.utils';
import { openInNewTab } from '@app/common/utils/open-in-new-tab';
import { DetailsPillButton } from '@app/components/details/details-pill-button';
import { getActivityActionKind } from '@app/features/activity-list/components/activity-row-actions';
import { usePendingBitcoinTxByTxid } from '@app/query/bitcoin/address/transactions-by-address.hooks';

interface PendingActionsProps {
  txid: string;
}

function StacksPendingActions({ txid }: PendingActionsProps) {
  const { pathname } = useLocation();
  const navigateToTransactionAction = useStacksTransactionActionNavigate();
  return (
    <>
      <DetailsPillButton
        label="Increase fee"
        onClick={() =>
          void navigateToTransactionAction(txid, StacksTransactionActionType.IncreaseFee, pathname)
        }
      />
      <DetailsPillButton
        label="Cancel"
        onClick={() =>
          void navigateToTransactionAction(txid, StacksTransactionActionType.Cancel, pathname)
        }
      />
    </>
  );
}

function BitcoinPendingActions({ txid }: PendingActionsProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pendingTx = usePendingBitcoinTxByTxid(txid);
  if (!pendingTx) return null;
  return (
    <DetailsPillButton
      label="Increase fee"
      onClick={() =>
        void navigate(RouteUrls.IncreaseBtcFee, {
          state: { btcTx: pendingTx, returnTo: pathname },
        })
      }
    />
  );
}

interface ActivityDetailsActionsProps {
  activity: BlockchainActivity;
  reclaimUrl?: string;
}

export function ActivityDetailsActions({ activity, reclaimUrl }: ActivityDetailsActionsProps) {
  const actionKind = getActivityActionKind(activity);
  if (!actionKind && !reclaimUrl) return null;
  return (
    <Flex
      gap="space.02"
      alignItems="center"
      justifyContent="center"
      px="space.05"
      pb="space.04"
      width="100%"
      maxWidth="390px"
      margin="0 auto"
    >
      {actionKind === 'stacks-manage' ? <StacksPendingActions txid={activity.txid} /> : null}
      {actionKind === 'bitcoin-increase-fee' ? (
        <BitcoinPendingActions txid={activity.txid} />
      ) : null}
      {reclaimUrl ? (
        <DetailsPillButton label="Reclaim" onClick={() => openInNewTab(reclaimUrl)} />
      ) : null}
    </Flex>
  );
}
