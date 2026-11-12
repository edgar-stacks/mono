import { btcAsset, stxAsset } from '@leather.io/constants';
import { formatActivityDateLabel } from '@leather.io/features';
import type { BlockchainActivity, Money } from '@leather.io/models';
import { baseCurrencyAmountInQuoteWithFallback, truncateMiddle } from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import { useStacksExplorerLink } from '@app/common/hooks/use-stacks-explorer-link';
import { copyToClipboard } from '@app/common/utils/copy-to-clipboard';
import { openInNewTab } from '@app/common/utils/open-in-new-tab';
import { DetailsRow } from '@app/components/details/details-row';
import { DetailsSection } from '@app/components/details/details-section';
import { useToast } from '@app/features/toasts/use-toast';
import { useMarketData } from '@app/query/common/market-data/market-data.query';

function formatActivityDate(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${formatActivityDateLabel(date)}, ${time}`;
}

function useFormatFee(fee: Money | undefined, chain: BlockchainActivity['chain']) {
  const marketData = useMarketData(chain === 'bitcoin' ? btcAsset : stxAsset);
  if (!fee) return undefined;
  const crypto = formatCurrency(fee);
  if (marketData.state !== 'success') return crypto;
  const quote = baseCurrencyAmountInQuoteWithFallback(fee, marketData.value);
  return `${crypto} (${formatCurrency(quote)})`;
}

interface ActivityTransactionDetailsProps {
  activity: BlockchainActivity;
}

export function ActivityTransactionDetails({ activity }: ActivityTransactionDetailsProps) {
  const toast = useToast();
  const { getStacksAddressLink } = useStacksExplorerLink();
  const fee = useFormatFee(activity.fee, activity.chain);
  const { contract, counterparty } = activity;

  async function copy(value: string) {
    await copyToClipboard(value);
    toast.success('Copied to clipboard!');
  }

  return (
    <DetailsSection title="Transaction details">
      <DetailsRow label="Date" value={formatActivityDate(activity.timestamp)} />
      {counterparty ? (
        <DetailsRow
          label={activity.initiatedByUser ? 'To' : 'From'}
          value={truncateMiddle(counterparty)}
          valueAction={() => void copy(counterparty)}
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
      {fee ? <DetailsRow label="Fee" value={fee} /> : null}
      {activity.nonce !== undefined ? <DetailsRow label="Nonce" value={activity.nonce} /> : null}
      {activity.blockHeight !== undefined ? (
        <DetailsRow label="Block" value={activity.blockHeight} />
      ) : null}
      <DetailsRow
        label="Transaction ID"
        value={truncateMiddle(activity.txid)}
        valueAction={() => void copy(activity.txid)}
      />
    </DetailsSection>
  );
}
