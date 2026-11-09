import { useNavigate } from 'react-router';

import { Flex } from 'leather-styles/jsx';

import type { BlockchainActivity } from '@leather.io/models';

import { RouteUrls } from '@shared/route-urls';

import { useStacksTransactionActionNavigate } from '@app/common/hooks/use-stacks-transaction-action-navigate';
import { StacksTransactionActionType } from '@app/common/transactions/stacks/transaction.utils';
import { openInNewTab } from '@app/common/utils/open-in-new-tab';
import { DetailsPillButton } from '@app/components/details/details-pill-button';
import { getActivityActionKind } from '@app/features/activity-list/components/activity-row-actions';
import type { SbtcDepositOverlay } from '@app/features/activity-list/sbtc-deposit-overlay';
import { transactionActionOpenerState } from '@app/features/dialogs/transaction-action-dialog/transaction-action-opener';
import { usePendingBitcoinTxByTxid } from '@app/query/bitcoin/address/transactions-by-address.hooks';

interface TxidProps {
  txid: string;
}

function StacksPendingActions({ txid }: TxidProps) {
  const navigateToTransactionAction = useStacksTransactionActionNavigate();
  return (
    <>
      <DetailsPillButton
        label="Increase fee"
        onClick={() =>
          void navigateToTransactionAction(txid, StacksTransactionActionType.IncreaseFee)
        }
      />
      <DetailsPillButton
        label="Cancel"
        onClick={() => void navigateToTransactionAction(txid, StacksTransactionActionType.Cancel)}
      />
    </>
  );
}

function BitcoinPendingActions({ txid }: TxidProps) {
  const navigate = useNavigate();
  const pendingTx = usePendingBitcoinTxByTxid(txid);
  if (!pendingTx) return null;
  return (
    <DetailsPillButton
      label="Increase fee"
      onClick={() =>
        void navigate(RouteUrls.IncreaseBtcFee, {
          state: { btcTx: pendingTx, ...transactionActionOpenerState },
        })
      }
    />
  );
}

interface ActivityDetailsActionsProps {
  activity: BlockchainActivity;
  sbtcOverlay?: SbtcDepositOverlay;
}

export function ActivityDetailsActions({ activity, sbtcOverlay }: ActivityDetailsActionsProps) {
  const reclaimUrl = sbtcOverlay?.reclaimUrl;
  const actionKind = getActivityActionKind(activity);

  function renderActions() {
    if (reclaimUrl) {
      return <DetailsPillButton label="Reclaim" onClick={() => openInNewTab(reclaimUrl)} />;
    }
    if (actionKind === 'stacks-manage') return <StacksPendingActions txid={activity.txid} />;
    if (actionKind === 'bitcoin-increase-fee') {
      return <BitcoinPendingActions txid={activity.txid} />;
    }
    return null;
  }

  if (!reclaimUrl && !actionKind) return null;

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
      {renderActions()}
    </Flex>
  );
}
