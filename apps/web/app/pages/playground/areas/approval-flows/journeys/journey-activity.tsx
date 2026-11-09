import { Flex, styled } from 'leather-styles/jsx';

import type { JourneyStage } from './journey-state';
import {
  type JourneyAccount,
  type JourneyActivityEntry,
  type JourneyWorld,
  formatAssetAmount,
  formatSignedAssetAmount,
  formatUsd,
  getAccountUsdValue,
  journeyAssetIds,
} from './journey-world';

interface PendingEntry {
  title: string;
  accountId: JourneyActivityEntry['accountId'];
}

interface AccountSummaryProps {
  account: JourneyAccount;
  world: JourneyWorld;
}

function AccountSummary({ account, world }: AccountSummaryProps) {
  const balances = world.balances[account.id];
  const held = journeyAssetIds.filter(asset => balances[asset] !== 0);
  return (
    <Flex
      direction="column"
      gap="space.01"
      p="space.03"
      borderRadius="sm"
      bg="ink.background-primary"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      minWidth="200px"
      data-account={account.id}
    >
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {account.name}
      </styled.span>
      <styled.span textStyle="label.01" color="ink.text-primary" data-account-value>
        {formatUsd(getAccountUsdValue(world, account.id))}
      </styled.span>
      {held.map(asset => (
        <styled.span key={asset} textStyle="caption.02" color="ink.text-subdued">
          {formatAssetAmount(asset, balances[asset])}
        </styled.span>
      ))}
    </Flex>
  );
}

interface ActivityRowProps {
  entry: JourneyActivityEntry;
  accountName: string;
}

function ActivityRow({ entry, accountName }: ActivityRowProps) {
  const [lead, second] = entry.movements;
  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      gap="space.03"
      p="space.03"
      borderBottomWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      data-activity={entry.key}
    >
      <Flex direction="column" minWidth={0}>
        <styled.span textStyle="label.02" color="ink.text-primary">
          {entry.title}
        </styled.span>
        <styled.span
          textStyle="caption.01"
          color={entry.status === 'failed' ? 'red.action-primary-default' : 'ink.text-subdued'}
        >
          {entry.status === 'failed' ? 'Failed · ' : ''}
          {accountName}
          {entry.fee ? ` · fee ${formatAssetAmount(entry.fee.asset, entry.fee.amount)}` : ''}
        </styled.span>
      </Flex>
      <Flex direction="column" alignItems="end">
        {lead ? (
          <styled.span textStyle="label.03" color="ink.text-primary">
            {formatSignedAssetAmount(lead)}
          </styled.span>
        ) : null}
        {second ? (
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {formatSignedAssetAmount(second)}
          </styled.span>
        ) : null}
      </Flex>
    </Flex>
  );
}

interface JourneyActivityProps {
  world: JourneyWorld;
  stage: JourneyStage;
  pending: PendingEntry | null;
}

export function JourneyActivity({ world, stage, pending }: JourneyActivityProps) {
  function accountName(accountId: JourneyActivityEntry['accountId']) {
    return world.accounts.find(account => account.id === accountId)?.name ?? accountId;
  }
  const isPending = stage === 'pending';

  return (
    <Flex direction="column" gap="space.05" p={{ base: 'space.04', md: 'space.06' }} flex={1}>
      <Flex gap="space.03" flexWrap="wrap">
        {world.accounts.map(account => (
          <AccountSummary key={account.id} account={account} world={world} />
        ))}
      </Flex>
      <Flex
        direction="column"
        borderRadius="md"
        bg="ink.background-primary"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="ink.border-default"
        maxWidth="640px"
      >
        <styled.h2 textStyle="label.01" color="ink.text-primary" p="space.03">
          Activity
        </styled.h2>
        {pending && isPending ? (
          <Flex
            alignItems="center"
            justifyContent="space-between"
            p="space.03"
            borderBottomWidth="1px"
            borderStyle="solid"
            borderColor="ink.border-default"
            data-activity="pending"
          >
            <Flex direction="column">
              <styled.span textStyle="label.02" color="ink.text-primary">
                {pending.title}
              </styled.span>
              <styled.span textStyle="caption.01" color="ink.text-subdued">
                Pending · {accountName(pending.accountId)}
              </styled.span>
            </Flex>
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              Balance unchanged until confirmed
            </styled.span>
          </Flex>
        ) : null}
        {world.activity.map(entry => (
          <ActivityRow key={entry.key} entry={entry} accountName={accountName(entry.accountId)} />
        ))}
      </Flex>
    </Flex>
  );
}
