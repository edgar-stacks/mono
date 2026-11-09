import { memo } from 'react';
import { useNavigate } from 'react-router';

import { styled } from 'leather-styles/jsx';

import {
  type BlockchainActivityDirection,
  type BlockchainActivityIndicator,
  type BlockchainActivityItem,
  formatActivityCaption,
  formatBlockchainActivityAmountCaption,
} from '@leather.io/features';
import {
  BlockchainActivityAvatarIcon,
  BlockchainActivityIndicatorIcon,
  Link,
  ListItemBox,
} from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';
import { openInNewTab } from '@app/common/utils/open-in-new-tab';
import { Balance } from '@app/components/balance/balance';

import { createActivityDetailsPath } from '../activity-details-path';
import type { SbtcDepositOverlay } from '../sbtc-deposit-overlay';
import { ActivityRowActions, getActivityActionKind } from './activity-row-actions';

const indicatorSize = 12;

interface ActivityRowProps {
  item: BlockchainActivityItem;
  sbtcOverlay?: SbtcDepositOverlay;
  onOpenDetails?(): void;
}

function resolveValueColor(
  indicator: BlockchainActivityIndicator,
  direction: BlockchainActivityDirection
) {
  if (indicator === 'pending' || indicator === 'failed') return 'ink.text-subdued';
  if (direction === 'received') return 'green.action-primary-default';
  return 'ink.text-primary';
}

function Row({ item, sbtcOverlay, onOpenDetails }: ActivityRowProps) {
  const { activity, view } = item;
  const navigate = useNavigate();

  const { amount } = view;
  const valueColor = amount ? resolveValueColor(view.indicator, amount.direction) : undefined;
  const actionKind = getActivityActionKind(activity);

  function openDetails() {
    onOpenDetails?.();
    void navigate(createActivityDetailsPath(view.chain, view.txid));
  }

  function renderAction() {
    const reclaimUrl = sbtcOverlay?.reclaimUrl;
    if (reclaimUrl) return <Link onClick={() => openInNewTab(reclaimUrl)}>Reclaim</Link>;
    if (actionKind) return <ActivityRowActions kind={actionKind} txid={view.txid} />;
    return undefined;
  }

  function renderTrailingCaption() {
    if (amount?.caption) {
      return (
        <styled.span textStyle="caption.01" color="ink.text-subdued" whiteSpace="nowrap">
          {formatBlockchainActivityAmountCaption(amount.caption, formatCurrency)}
        </styled.span>
      );
    }
    if (!amount?.crypto) return undefined;
    return (
      <Balance
        balance={amount.quote}
        color="ink.text-subdued"
        textStyle="caption.01"
        whiteSpace="nowrap"
        formatCurrency={formatCurrency}
      />
    );
  }

  return (
    <ListItemBox
      onClick={openDetails}
      leading={
        <BlockchainActivityAvatarIcon
          avatar={view.avatar}
          indicator={
            <BlockchainActivityIndicatorIcon indicator={view.indicator} size={indicatorSize} />
          }
        />
      }
      title={
        <styled.span
          textStyle="label.02"
          color={view.status === 'success' ? 'ink.text-primary' : 'ink.text-subdued'}
          display="block"
          minWidth={0}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {sbtcOverlay?.title || view.title || view.subtitle || '—'}
        </styled.span>
      }
      caption={
        sbtcOverlay ? (
          <styled.span textStyle="caption.01" color={sbtcOverlay.statusColor}>
            {sbtcOverlay.statusLabel}
          </styled.span>
        ) : (
          view.subtitle || formatActivityCaption({ timestamp: view.timestamp })
        )
      }
      trailing={
        amount ? (
          <Balance
            balance={amount.crypto ?? amount.quote}
            operator={amount.direction === 'received' ? '+' : '−'}
            formattingOptions={
              amount.crypto && !amount.showSymbol ? { showCurrency: false } : undefined
            }
            color={valueColor}
            textStyle="label.02"
            whiteSpace="nowrap"
            formatCurrency={formatCurrency}
          />
        ) : undefined
      }
      trailingCaption={renderTrailingCaption()}
      action={renderAction()}
    />
  );
}

export const ActivityRow = memo(Row);
