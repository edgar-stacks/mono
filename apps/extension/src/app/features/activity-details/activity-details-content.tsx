import { Stack, styled } from 'leather-styles/jsx';

import { btcAsset, stxAsset } from '@leather.io/constants';
import {
  type BlockchainActivityItem,
  addOperator,
  buildBlockchainActivityHeroLines,
} from '@leather.io/features';
import type { BlockchainActivityBalanceChange, MarketData, Money } from '@leather.io/models';
import { BlockchainActivityAvatarIcon, BlockchainActivityIndicatorIcon } from '@leather.io/ui';
import { baseCurrencyAmountInQuote, minusSign, truncateMiddle } from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import { useStacksExplorerLink } from '@app/common/hooks/use-stacks-explorer-link';
import { copyToClipboard } from '@app/common/utils/copy-to-clipboard';
import { openInNewTab } from '@app/common/utils/open-in-new-tab';
import { DetailsRow } from '@app/components/details/details-row';
import { DetailsSection } from '@app/components/details/details-section';
import type { SbtcDepositOverlay } from '@app/features/activity-list/sbtc-deposit-overlay';
import { useToast } from '@app/features/toasts/use-toast';
import { useMarketData } from '@app/query/common/market-data/market-data.query';

import { ActivityDetailsActions } from './activity-details-actions';
import { ActivityDetailsExplorerButton } from './activity-details-explorer-button';

const heroAvatarSize = 56;
const heroIndicatorSize = 16;

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function toFiat(money: Money, marketData?: MarketData) {
  if (!marketData || marketData.pair.base !== money.symbol) return undefined;
  return baseCurrencyAmountInQuote(money, marketData);
}

interface MoneyWithFiatProps {
  crypto: string;
  fiat?: Money;
}

function MoneyWithFiat({ crypto, fiat }: MoneyWithFiatProps) {
  return (
    <>
      {crypto}
      {fiat && fiat.amount.isGreaterThan(0) ? (
        <styled.span color="ink.text-subdued"> · {formatCurrency(fiat)}</styled.span>
      ) : null}
    </>
  );
}

function formatBalanceChange(change: BlockchainActivityBalanceChange) {
  return addOperator(
    formatCurrency(change.amount.crypto),
    change.direction === 'received' ? '+' : minusSign
  );
}

interface ActivityDetailsContentProps {
  item: BlockchainActivityItem;
  sbtcOverlay?: SbtcDepositOverlay;
}

export function ActivityDetailsContent({ item, sbtcOverlay }: ActivityDetailsContentProps) {
  const { activity, view } = item;
  const toast = useToast();
  const { getStacksAddressLink } = useStacksExplorerLink();
  const marketData = useMarketData(view.chain === 'bitcoin' ? btcAsset : stxAsset);
  const feeMarketData = marketData.state === 'success' ? marketData.value : undefined;

  const hero = sbtcOverlay
    ? { title: sbtcOverlay.title, subtitle: sbtcOverlay.statusLabel }
    : buildBlockchainActivityHeroLines(view);
  const { contract, counterparty, fee, nonce, blockHeight } = activity;

  function copy(value: string) {
    void copyToClipboard(value);
    toast.success('Copied to clipboard');
  }

  return (
    <>
      <Stack alignItems="center" gap="space.04" px="space.05" py="space.05">
        <BlockchainActivityAvatarIcon
          avatar={view.avatar}
          size={heroAvatarSize}
          indicator={
            <BlockchainActivityIndicatorIcon indicator={view.indicator} size={heroIndicatorSize} />
          }
        />
        <Stack alignItems="center" gap="space.01">
          <styled.h2 textStyle="heading.04" textAlign="center">
            {hero.title}
          </styled.h2>
          {hero.subtitle ? (
            <styled.span
              textStyle="label.02"
              color={sbtcOverlay?.statusColor ?? 'ink.text-subdued'}
              textAlign="center"
            >
              {hero.subtitle}
            </styled.span>
          ) : null}
        </Stack>
        <ActivityDetailsActions activity={activity} reclaimUrl={sbtcOverlay?.reclaimUrl} />
      </Stack>

      {activity.balanceChanges.length > 0 ? (
        <DetailsSection title="Balance changes">
          {activity.balanceChanges.map((change, index) => (
            <DetailsRow
              key={`${change.direction}-${change.amount.crypto.symbol}-${index}`}
              label={change.direction === 'received' ? 'Received' : 'Sent'}
              value={
                <MoneyWithFiat crypto={formatBalanceChange(change)} fiat={change.amount.quote} />
              }
            />
          ))}
        </DetailsSection>
      ) : null}

      <DetailsSection title="Transaction details">
        <DetailsRow
          label="Date"
          value={
            view.status === 'pending'
              ? 'Pending'
              : dateTimeFormat.format(new Date(view.timestamp * 1000))
          }
        />
        {counterparty ? (
          <DetailsRow
            label={activity.initiatedByUser ? 'To' : 'From'}
            value={truncateMiddle(counterparty)}
            valueAction={() => copy(counterparty)}
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
        {view.protocolName ? <DetailsRow label="Protocol" value={view.protocolName} /> : null}
        {fee ? (
          <DetailsRow
            label="Fee"
            value={<MoneyWithFiat crypto={formatCurrency(fee)} fiat={toFiat(fee, feeMarketData)} />}
          />
        ) : null}
        {nonce !== undefined ? <DetailsRow label="Nonce" value={nonce} /> : null}
        {blockHeight !== undefined ? <DetailsRow label="Block" value={blockHeight} /> : null}
        <DetailsRow
          label="Transaction ID"
          value={truncateMiddle(view.txid)}
          valueAction={() => copy(view.txid)}
        />
      </DetailsSection>

      <Stack px="space.05" py="space.05">
        <ActivityDetailsExplorerButton chain={view.chain} txid={view.txid} />
      </Stack>
    </>
  );
}
