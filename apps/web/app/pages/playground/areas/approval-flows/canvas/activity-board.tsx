import { useState } from 'react';

import { Flex, Grid, styled } from 'leather-styles/jsx';

import {
  type ActivityFixture,
  type ActivityPresentation,
  currentActivityPresentation,
  mappedActivityRows,
  proposedActivityPresentation,
  unmappedActivityRows,
} from '../scenarios/activity-list-fixtures';
import { formatAssetAmount } from '../scenarios/approval-assets';
import { ActivityRow } from './activity-row';

function ActivityDetails({ row }: { row: ActivityFixture }) {
  const facts = [
    { label: 'Status', value: row.status },
    { label: 'Contract', value: row.contract },
    { label: 'Function', value: row.functionName },
    {
      label: 'Balance changes',
      value:
        row.changes.length > 0
          ? row.changes.map(change => formatAssetAmount(change, { signed: true })).join(', ')
          : 'None',
    },
    { label: 'Fee', value: formatAssetAmount(row.fee) },
  ];
  return (
    <Flex direction="column" gap="space.01" px="space.03" pb="space.03">
      {facts.map(fact =>
        fact.value ? (
          <Flex key={fact.label} justifyContent="space-between" gap="space.03">
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {fact.label}
            </styled.span>
            <styled.span
              textStyle="caption.01"
              color="ink.text-primary"
              wordBreak="break-all"
              textAlign="right"
            >
              {fact.value}
            </styled.span>
          </Flex>
        ) : null
      )}
    </Flex>
  );
}

interface ActivityColumnProps {
  title: string;
  rows: ActivityFixture[];
  present(row: ActivityFixture): ActivityPresentation;
  expanded: string | null;
  onToggle(id: string): void;
}

function ActivityColumn({ title, rows, present, expanded, onToggle }: ActivityColumnProps) {
  return (
    <Flex
      direction="column"
      gap="space.02"
      p="space.03"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      bg="ink.background-primary"
      maxWidth="420px"
      width="100%"
    >
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {title}
      </styled.span>
      {rows.map(row => (
        <Flex key={row.id} direction="column">
          <ActivityRow
            presentation={present(row)}
            time={row.time}
            status={row.status}
            expanded={expanded === row.id}
            onToggle={() => onToggle(row.id)}
          />
          {expanded === row.id ? <ActivityDetails row={row} /> : null}
        </Flex>
      ))}
    </Flex>
  );
}

export function ActivityBoard() {
  const [expanded, setExpanded] = useState<string | null>(null);
  function toggle(id: string) {
    setExpanded(current => (current === id ? null : id));
  }

  return (
    <Flex direction="column" gap="space.05" px={{ base: 'space.03', md: 'space.06' }} py="space.06">
      <Flex direction="column" gap="space.02" maxWidth="720px">
        <styled.h2 textStyle="heading.04" color="ink.text-primary">
          Activity
        </styled.h2>
        <styled.p textStyle="body.01" color="ink.text-subdued">
          Contract calls Leather cannot map keep their contract and function. Once confirmed, the
          trailing slot summarises the account&apos;s net balance change: received above spent, fiat
          for a single asset, a count for three or more. Pending and failed rows keep today&apos;s
          presentation. Select a row for details.
        </styled.p>
      </Flex>
      <Grid gridTemplateColumns={{ base: '1fr', lg: 'repeat(3, minmax(0, 420px))' }} gap="space.04">
        <ActivityColumn
          title="Unmapped calls today"
          rows={unmappedActivityRows}
          present={currentActivityPresentation}
          expanded={expanded}
          onToggle={toggle}
        />
        <ActivityColumn
          title="Unmapped calls proposed"
          rows={unmappedActivityRows}
          present={proposedActivityPresentation}
          expanded={expanded}
          onToggle={toggle}
        />
        <ActivityColumn
          title="Mapped shapes for comparison"
          rows={mappedActivityRows}
          present={proposedActivityPresentation}
          expanded={expanded}
          onToggle={toggle}
        />
      </Grid>
    </Flex>
  );
}
