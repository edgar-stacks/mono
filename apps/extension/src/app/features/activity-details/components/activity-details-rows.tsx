import { btcAsset, stxAsset } from '@leather.io/constants';
import type { BlockchainActivity, Money } from '@leather.io/models';
import { baseCurrencyAmountInQuote, truncateMiddle } from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import { useStacksExplorerLink } from '@app/common/hooks/use-stacks-explorer-link';
import { copyToClipboard } from '@app/common/utils/copy-to-clipboard';
import { openInNewTab } from '@app/common/utils/open-in-new-tab';
import { DetailsRow } from '@app/components/details/details-row';
import { DetailsSection } from '@app/components/details/details-section';
import { useToast } from '@app/features/toasts/use-toast';
import { useMarketData } from '@app/query/common/market-data/market-data.query';

const dateFormatOptions: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

function formatActivityDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString('en-US', dateFormatOptions);
}

function useFeeFiat(activity: BlockchainActivity): Money | undefined {
  const marketData = useMarketData(activity.chain === 'bitcoin' ? btcAsset : stxAsset);
  if (!activity.fee || marketData.state !== 'success') return undefined;
  return baseCurrencyAmountInQuote(activity.fee, marketData.value);
}

function formatFee(fee: Money, fiat?: Money) {
  return fiat ? `${formatCurrency(fee)} · ${formatCurrency(fiat)}` : formatCurrency(fee);
}

interface ActivityDetailsRowsProps {
  activity: BlockchainActivity;
}

export function ActivityDetailsRows({ activity }: ActivityDetailsRowsProps) {
  const toast = useToast();
  const { getStacksAddressLink } = useStacksExplorerLink();
  const feeFiat = useFeeFiat(activity);
  const { contract, counterparty, fee } = activity;

  function copy(value: string, message: string) {
    void copyToClipboard(value);
    toast.success(message);
  }

  return (
    <DetailsSection title="Transaction details">
      <DetailsRow label="Date" value={formatActivityDate(activity.timestamp)} />
      {counterparty ? (
        <DetailsRow
          label={activity.initiatedByUser ? 'To' : 'From'}
          value={truncateMiddle(counterparty)}
          valueAction={() => copy(counterparty, 'Address copied to clipboard')}
        />
      ) : null}
      {contract ? (
        <DetailsRow
          label="Contract"
          value={truncateMiddle(contract.contractId)}
          valueAction={() => openInNewTab(getStacksAddressLink(contract.contractId))}
        />
      ) : null}
      {contract?.type === 'call' ? (
        <DetailsRow label="Function" value={contract.functionName} />
      ) : null}
      {activity.protocolName ? <DetailsRow label="Protocol" value={activity.protocolName} /> : null}
      {fee ? <DetailsRow label="Fee" value={formatFee(fee, feeFiat)} /> : null}
      {activity.nonce !== undefined ? <DetailsRow label="Nonce" value={activity.nonce} /> : null}
      {activity.blockHeight !== undefined ? (
        <DetailsRow label="Block" value={activity.blockHeight} />
      ) : null}
      <DetailsRow
        label="Transaction ID"
        value={truncateMiddle(activity.txid)}
        valueAction={() => copy(activity.txid, 'Transaction ID copied to clipboard')}
      />
    </DetailsSection>
  );
}
