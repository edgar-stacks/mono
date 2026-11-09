import type { Ref } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

import { ActivityRow } from '../canvas/activity-row';
import {
  type ActivityPresentation,
  proposedActivityPresentation,
  unmappedActivityRows,
} from '../scenarios/activity-list-fixtures';
import {
  type AssetAmount,
  approvalAssetSymbols,
  formatAssetAmount,
  formatUsd,
} from '../scenarios/approval-assets';
import type { ApprovalMovement } from '../scenarios/approval-scenario.types';
import type { JourneyTransaction } from './journey-state';
import { type WorldAccount, accountUsdValue } from './journey-world';

function signedChange(movement: ApprovalMovement): AssetAmount {
  return {
    asset: movement.amount.asset,
    baseUnits: movement.direction === 'in' ? movement.amount.baseUnits : -movement.amount.baseUnits,
  };
}

function transactionPresentation(transaction: JourneyTransaction): ActivityPresentation {
  return proposedActivityPresentation({
    id: transaction.id,
    status: transaction.status,
    mapped: true,
    title: transaction.title,
    caption: transaction.caption,
    changes: transaction.movements.map(signedChange),
    fee: transaction.fee ?? { asset: 'STX', baseUnits: 0 },
    time: 'Now',
  });
}

const earlierRows = unmappedActivityRows.filter(row => row.status === 'confirmed').slice(0, 2);

interface JourneyActivityProps {
  accounts: WorldAccount[];
  transactions: JourneyTransaction[];
  highlightId: string | null;
  panelRef?: Ref<HTMLElement>;
}

export function JourneyActivity({
  accounts,
  transactions,
  highlightId,
  panelRef,
}: JourneyActivityProps) {
  return (
    <styled.section
      ref={panelRef}
      tabIndex={-1}
      aria-label="Leather Activity"
      display="flex"
      flexDirection="column"
      gap="space.04"
      p="space.04"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      bg="ink.background-primary"
      outline="none"
    >
      <styled.h2 textStyle="label.01" color="ink.text-primary">
        Leather
      </styled.h2>
      <Flex direction="column" gap="space.03">
        {accounts.map(account => (
          <Flex key={account.id} direction="column" gap="space.01">
            <Flex justifyContent="space-between" gap="space.03">
              <styled.span textStyle="label.02" color="ink.text-primary">
                {account.label}
              </styled.span>
              <styled.span textStyle="label.02" color="ink.text-primary">
                {formatUsd(accountUsdValue(account))}
              </styled.span>
            </Flex>
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {approvalAssetSymbols
                .filter(asset => account.balances[asset] !== 0)
                .map(asset => formatAssetAmount({ asset, baseUnits: account.balances[asset] }))
                .join(' · ')}
            </styled.span>
          </Flex>
        ))}
      </Flex>
      <Flex direction="column" gap="space.01">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Activity
        </styled.span>
        {transactions.length === 0 ? (
          <styled.span textStyle="body.02" color="ink.text-subdued" py="space.02">
            Nothing from this session yet. Sign-only requests never appear here.
          </styled.span>
        ) : null}
        {transactions.map(transaction => (
          <Flex
            key={transaction.id}
            borderRadius="sm"
            bg={transaction.id === highlightId ? 'ink.background-secondary' : 'transparent'}
            data-status={transaction.status}
          >
            <ActivityRow
              presentation={transactionPresentation(transaction)}
              time="Now"
              status={transaction.status}
            />
          </Flex>
        ))}
        {earlierRows.map(row => (
          <ActivityRow
            key={row.id}
            presentation={proposedActivityPresentation(row)}
            time={row.time}
            status={row.status}
          />
        ))}
      </Flex>
    </styled.section>
  );
}
