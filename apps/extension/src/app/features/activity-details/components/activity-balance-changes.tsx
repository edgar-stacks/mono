import { Flex, Stack, styled } from 'leather-styles/jsx';

import type { BlockchainActivityBalanceChange } from '@leather.io/models';
import { BlockchainActivityAvatarIcon } from '@leather.io/ui';

import { formatCurrency } from '@app/common/currency-formatter';
import { Balance } from '@app/components/balance/balance';
import { DetailsSection } from '@app/components/details/details-section';

const balanceChangeAvatarSize = 32;

interface ActivityBalanceChangeRowProps {
  change: BlockchainActivityBalanceChange;
}

function ActivityBalanceChangeRow({ change }: ActivityBalanceChangeRowProps) {
  const isReceived = change.direction === 'received';
  return (
    <Flex
      px="space.05"
      py="space.03"
      alignItems="center"
      justifyContent="space-between"
      gap="space.03"
    >
      <Flex alignItems="center" gap="space.03" minWidth={0}>
        <BlockchainActivityAvatarIcon
          avatar={{ kind: 'single', asset: change.asset }}
          size={balanceChangeAvatarSize}
        />
        <Stack gap="2px" minWidth={0}>
          <styled.span textStyle="label.02">{isReceived ? 'Received' : 'Sent'}</styled.span>
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {change.amount.crypto.symbol}
          </styled.span>
        </Stack>
      </Flex>
      <Stack gap="2px" alignItems="flex-end">
        <Balance
          balance={change.amount.crypto}
          operator={isReceived ? '+' : '−'}
          formattingOptions={{ showCurrency: false }}
          color={isReceived ? 'green.action-primary-default' : 'ink.text-primary'}
          textStyle="label.02"
          whiteSpace="nowrap"
          formatCurrency={formatCurrency}
        />
        <Balance
          balance={change.amount.quote}
          color="ink.text-subdued"
          textStyle="caption.01"
          whiteSpace="nowrap"
          formatCurrency={formatCurrency}
        />
      </Stack>
    </Flex>
  );
}

interface ActivityBalanceChangesProps {
  balanceChanges: BlockchainActivityBalanceChange[];
}

export function ActivityBalanceChanges({ balanceChanges }: ActivityBalanceChangesProps) {
  if (balanceChanges.length === 0) return null;
  return (
    <DetailsSection title="Balance changes">
      {balanceChanges.map((change, index) => (
        <ActivityBalanceChangeRow key={`${change.direction}-${index}`} change={change} />
      ))}
    </DetailsSection>
  );
}
