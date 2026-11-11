import { useState } from 'react';

import { Flex, Grid, styled } from 'leather-styles/jsx';

import { truncateMiddle } from '@leather.io/utils';

import { ActivityRow } from '../pattern/activity-row';
import { ApprovalRow } from '../pattern/approval-rows';
import {
  type ActivityTrailing,
  type ContractCallActivity,
  type MappedActivity,
  mappedActivities,
  netBalanceChanges,
  summarizeActivityTrailing,
  unmappedContractCalls,
} from '../scenarios/activity-list-fixtures';
import {
  type AssetAmount,
  fiatValue,
  formatAssetAmount,
  formatFiat,
} from '../scenarios/approval-assets';

function contractName(contractId: string) {
  return contractId.split('.')[1] ?? contractId;
}

function mappedTrailing(row: MappedActivity): ActivityTrailing | null {
  const [change] = row.changes;
  if (row.shape === 'swap' || !change) return summarizeActivityTrailing(row.status, row.changes);
  return {
    primary: formatAssetAmount(change, { signed: true }),
    secondary: formatFiat(fiatValue(change), { signed: true }),
    tone: change.amount > 0 ? 'received' : 'spent',
  };
}

function minutesLabel(minutesAgo: number) {
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  return `${Math.round(minutesAgo / 60)} h ago`;
}

interface ActivityDetail {
  id: string;
  title: string;
  status: ContractCallActivity['status'];
  minutesAgo: number;
  contractId?: string;
  changes: AssetAmount[];
  fee?: AssetAmount;
}

function ActivityDetails({ detail }: { detail: ActivityDetail }) {
  const net = netBalanceChanges(detail.changes);
  const feeCharged = detail.status !== 'pending';
  return (
    <Flex
      direction="column"
      gap="space.02"
      p="space.04"
      borderRadius="md"
      bg="ink.background-secondary"
    >
      <styled.h3 textStyle="label.01" color="ink.text-primary">
        {detail.title}
      </styled.h3>
      <ApprovalRow label="Status" value={detail.status} caption={minutesLabel(detail.minutesAgo)} />
      {detail.contractId ? (
        <ApprovalRow
          label="Contract"
          value={contractName(detail.contractId)}
          caption={truncateMiddle(detail.contractId, 5)}
        />
      ) : null}
      <styled.span textStyle="label.03" color="ink.text-subdued">
        Balance changes
      </styled.span>
      {detail.status === 'confirmed' && net.length > 0 ? (
        net.map(change => (
          <ApprovalRow
            key={change.symbol}
            label={change.amount > 0 ? 'Received' : 'Spent'}
            value={formatAssetAmount(change, { signed: true })}
            caption={formatFiat(fiatValue(change), { signed: true })}
          />
        ))
      ) : (
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {detail.status === 'confirmed'
            ? 'No balance changed.'
            : 'Nothing settles until the transaction confirms.'}
        </styled.span>
      )}
      {detail.fee ? (
        <ApprovalRow
          label="Fee"
          value={formatAssetAmount(detail.fee)}
          caption={feeCharged ? 'Charged' : 'Charged once it confirms or fails'}
        />
      ) : null}
    </Flex>
  );
}

function toDetail(row: ContractCallActivity | MappedActivity): ActivityDetail {
  if ('functionName' in row) {
    return {
      id: row.id,
      title: row.functionName,
      status: row.status,
      minutesAgo: row.minutesAgo,
      contractId: row.contractId,
      changes: row.changes,
      fee: row.fee,
    };
  }
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    minutesAgo: row.minutesAgo,
    changes: row.changes,
    fee: row.fee,
  };
}

function ColumnHeading({ title, caption }: { title: string; caption: string }) {
  return (
    <Flex direction="column" gap="space.00" px="space.03">
      <styled.span textStyle="label.02" color="ink.text-primary">
        {title}
      </styled.span>
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {caption}
      </styled.span>
    </Flex>
  );
}

export function ActivityView() {
  const [selectedId, setSelectedId] = useState(unmappedContractCalls[0].id);
  const allRows = [...unmappedContractCalls, ...mappedActivities];
  const selected = allRows.find(row => row.id === selectedId) ?? allRows[0];

  return (
    <Flex
      direction="column"
      gap="space.05"
      px={{ base: 'space.03', md: 'space.06' }}
      py="space.05"
      pb="120px"
    >
      <styled.p textStyle="body.02" color="ink.text-subdued" maxWidth="760px">
        Contract calls Leather cannot map to a send, receive or swap. Confirmed rows keep their
        function and contract and summarize what the account gained and spent in the trailing slot.
        Pending and failed rows keep today’s presentation. Select a row for details.
      </styled.p>
      <Grid
        gridTemplateColumns={{ base: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr) 320px' }}
        gap="space.05"
        alignItems="start"
      >
        <Flex direction="column" gap="space.02">
          <ColumnHeading title="Today" caption="Unmapped contract calls" />
          {unmappedContractCalls.map(row => (
            <ActivityRow
              key={row.id}
              icon="function"
              title={row.functionName}
              subtitle={contractName(row.contractId)}
              status={row.status}
              trailing={null}
            />
          ))}
        </Flex>
        <Flex direction="column" gap="space.02">
          <ColumnHeading title="Proposed" caption="Net balance change in the trailing slot" />
          {unmappedContractCalls.map(row => (
            <ActivityRow
              key={row.id}
              icon="function"
              title={row.functionName}
              subtitle={`${row.appName} · ${contractName(row.contractId)}`}
              status={row.status}
              trailing={summarizeActivityTrailing(row.status, row.changes)}
              selected={row.id === selected.id}
              onSelect={() => setSelectedId(row.id)}
            />
          ))}
          <ColumnHeading
            title="Mapped shapes"
            caption="Sends, receives and swaps, for comparison"
          />
          {mappedActivities.map(row => (
            <ActivityRow
              key={row.id}
              icon={row.shape}
              title={row.title}
              subtitle={row.subtitle}
              status={row.status}
              trailing={mappedTrailing(row)}
              selected={row.id === selected.id}
              onSelect={() => setSelectedId(row.id)}
            />
          ))}
        </Flex>
        <ActivityDetails detail={toDetail(selected)} />
      </Grid>
    </Flex>
  );
}
