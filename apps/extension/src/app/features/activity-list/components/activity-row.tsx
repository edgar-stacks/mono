import { memo } from 'react';
import { useNavigate } from 'react-router';

import { styled } from 'leather-styles/jsx';

import { type BlockchainActivityItem, formatActivityCaption } from '@leather.io/features';
import {
  BlockchainActivityAvatarIcon,
  BlockchainActivityIndicatorIcon,
  Link,
  ListItemBox,
} from '@leather.io/ui';

import { openInNewTab } from '@app/common/utils/open-in-new-tab';
import { createActivityDetailsPath } from '@app/features/activity-details/activity-details-path';

import type { SbtcDepositOverlay } from '../sbtc-deposit-overlay';
import { ActivityRowActions, getActivityActionKind } from './activity-row-actions';
import { ActivityRowAmount, ActivityRowAmountCaption } from './activity-row-amount';

const indicatorSize = 12;

interface ActivityRowProps {
  item: BlockchainActivityItem;
  sbtcOverlay?: SbtcDepositOverlay;
  onOpen?(): void;
}

function Row({ item, sbtcOverlay, onOpen }: ActivityRowProps) {
  const { activity, view } = item;
  const navigate = useNavigate();

  const { amount } = view;
  const actionKind = getActivityActionKind(activity);

  function openDetails() {
    onOpen?.();
    void navigate(createActivityDetailsPath(view.chain, view.txid));
  }

  function renderAction() {
    const reclaimUrl = sbtcOverlay?.reclaimUrl;
    if (reclaimUrl) return <Link onClick={() => openInNewTab(reclaimUrl)}>Reclaim</Link>;
    if (actionKind) return <ActivityRowActions kind={actionKind} txid={view.txid} />;
    return undefined;
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
        amount ? <ActivityRowAmount amount={amount} indicator={view.indicator} /> : undefined
      }
      trailingCaption={
        amount && (amount.caption || amount.crypto) ? (
          <ActivityRowAmountCaption amount={amount} />
        ) : undefined
      }
      action={renderAction()}
    />
  );
}

export const ActivityRow = memo(Row);
