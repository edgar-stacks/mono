import { type ReactNode, useState } from 'react';

import { Box, Flex, Grid, styled } from 'leather-styles/jsx';

import { FunctionIcon } from '@leather.io/ui';

import { formatAssetAmount, formatSignedAssetAmount } from '../journeys/journey-world';
import {
  type ActivityRowStatus,
  type ActivityTrailing,
  type MappedActivityShape,
  type UnmappedActivityRow,
  getContractName,
  mappedActivityShapes,
  summarizeNetBalanceChange,
  unmappedActivityRows,
} from '../scenarios/activity-list-fixtures';

const statusLabels: Record<ActivityRowStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  failed: 'Failed',
};

function formatAge(minutesAgo: number) {
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  if (minutesAgo < 1_440) return `${Math.round(minutesAgo / 60)}h ago`;
  return `${Math.round(minutesAgo / 1_440)}d ago`;
}

interface RowShellProps {
  title: string;
  subtitle: string;
  status: ActivityRowStatus;
  trailing?: ActivityTrailing;
  isSelected?: boolean;
  onSelect?(): void;
}

interface TrailingSlotProps {
  trailing?: ActivityTrailing;
}

function TrailingSlot({ trailing }: TrailingSlotProps) {
  if (!trailing || trailing.kind === 'none' || trailing.kind === 'current') return null;
  if (trailing.kind === 'count') {
    return (
      <styled.span textStyle="label.03" color="ink.text-primary">
        {trailing.label}
      </styled.span>
    );
  }
  return (
    <Flex direction="column" alignItems="end">
      <styled.span textStyle="label.03" color="ink.text-primary">
        {trailing.primary}
      </styled.span>
      {trailing.secondary ? (
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {trailing.secondary}
        </styled.span>
      ) : null}
    </Flex>
  );
}

function RowShell({ title, subtitle, status, trailing, isSelected, onSelect }: RowShellProps) {
  return (
    <styled.button
      type="button"
      onClick={onSelect}
      display="flex"
      alignItems="center"
      gap="space.03"
      width="100%"
      p="space.03"
      borderRadius="sm"
      textAlign="left"
      bg={isSelected ? 'ink.background-secondary' : 'transparent'}
      _hover={{ bg: 'ink.background-secondary' }}
      data-status={status}
    >
      <Flex
        alignItems="center"
        justifyContent="center"
        width="40px"
        height="40px"
        flexShrink={0}
        borderRadius="round"
        bg="ink.component-background-default"
        color="ink.text-primary"
      >
        <FunctionIcon variant="small" />
      </Flex>
      <Flex direction="column" flex={1} minWidth={0}>
        <styled.span textStyle="label.02" color="ink.text-primary" truncate>
          {title}
        </styled.span>
        <styled.span
          textStyle="caption.01"
          color={status === 'failed' ? 'red.action-primary-default' : 'ink.text-subdued'}
          truncate
        >
          {status === 'confirmed' ? subtitle : `${statusLabels[status]} · ${subtitle}`}
        </styled.span>
      </Flex>
      <TrailingSlot trailing={trailing} />
    </styled.button>
  );
}

interface MappedRowProps {
  shape: MappedActivityShape;
}

function MappedRow({ shape }: MappedRowProps) {
  return (
    <RowShell
      title={shape.title}
      subtitle={shape.subtitle}
      status={shape.status}
      trailing={{ kind: 'amounts', primary: shape.primary, secondary: shape.secondary }}
    />
  );
}

interface RowDetailsProps {
  row: UnmappedActivityRow;
}

function RowDetails({ row }: RowDetailsProps) {
  return (
    <Flex
      direction="column"
      gap="space.02"
      p="space.04"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
    >
      <styled.h3 textStyle="label.01" color="ink.text-primary">
        {row.functionName}
      </styled.h3>
      <styled.span textStyle="caption.01" color="ink.text-subdued" wordBreak="break-all">
        {row.contractId}
      </styled.span>
      <styled.span textStyle="caption.01" color="ink.text-primary">
        {statusLabels[row.status]} · {formatAge(row.minutesAgo)}
      </styled.span>
      <styled.h4 textStyle="label.03" color="ink.text-primary" pt="space.02">
        Balance changes
      </styled.h4>
      {row.balanceChanges.length === 0 ? (
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          None
        </styled.span>
      ) : (
        row.balanceChanges.map(change => (
          <styled.span key={change.asset} textStyle="caption.01" color="ink.text-primary">
            {formatSignedAssetAmount(change)}
          </styled.span>
        ))
      )}
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        Fee {formatAssetAmount(row.fee.asset, row.fee.amount)}
      </styled.span>
      <styled.span textStyle="caption.02" color="ink.text-subdued" wordBreak="break-all">
        {row.txid}
      </styled.span>
    </Flex>
  );
}

interface ColumnProps {
  title: string;
  children: ReactNode;
}

function Column({ title, children }: ColumnProps) {
  return (
    <Flex direction="column" gap="space.02" minWidth={0}>
      <styled.h2 textStyle="label.01" color="ink.text-primary">
        {title}
      </styled.h2>
      <Box
        borderRadius="md"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="ink.border-default"
        p="space.01"
      >
        {children}
      </Box>
    </Flex>
  );
}

export function ApprovalActivity() {
  const [selectedId, setSelectedId] = useState<string | undefined>(unmappedActivityRows[0]?.id);
  const selected = unmappedActivityRows.find(row => row.id === selectedId);

  return (
    <Flex direction="column" gap="space.05" px={{ base: 'space.04', md: 'space.06' }} py="space.06">
      <styled.p textStyle="body.02" color="ink.text-subdued" maxWidth="720px">
        Seven unmapped contract calls as Activity shows them today, next to the proposed rows that
        keep the contract and function but summarize the account’s net balance change. Pending and
        failed rows keep today’s presentation.
      </styled.p>
      <Grid
        gridTemplateColumns={{ base: '1fr', lg: 'repeat(3, minmax(0, 1fr))' }}
        gap="space.05"
        alignItems="start"
      >
        <Column title="Today">
          {unmappedActivityRows.map(row => (
            <RowShell
              key={row.id}
              title={row.functionName}
              subtitle={getContractName(row.contractId)}
              status={row.status}
              isSelected={row.id === selectedId}
              onSelect={() => setSelectedId(row.id)}
            />
          ))}
        </Column>
        <Column title="Proposed">
          {unmappedActivityRows.map(row => (
            <RowShell
              key={row.id}
              title={row.functionName}
              subtitle={getContractName(row.contractId)}
              status={row.status}
              trailing={summarizeNetBalanceChange(row)}
              isSelected={row.id === selectedId}
              onSelect={() => setSelectedId(row.id)}
            />
          ))}
        </Column>
        <Flex direction="column" gap="space.05">
          {selected ? <RowDetails row={selected} /> : null}
          <Column title="Mapped shapes for comparison">
            {mappedActivityShapes.map(shape => (
              <MappedRow key={shape.id} shape={shape} />
            ))}
          </Column>
        </Flex>
      </Grid>
    </Flex>
  );
}
