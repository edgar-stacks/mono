import { Flex, styled } from 'leather-styles/jsx';

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsRepeatLeftRightIcon,
  FunctionIcon,
} from '@leather.io/ui';

import type { ActivityRowStatus, ActivityTrailing } from '../scenarios/activity-list-fixtures';

export type ActivityRowIcon = 'function' | 'send' | 'receive' | 'swap';

function RowIcon({ icon }: { icon: ActivityRowIcon }) {
  if (icon === 'send') return <ArrowUpIcon variant="small" />;
  if (icon === 'receive') return <ArrowDownIcon variant="small" />;
  if (icon === 'swap') return <ArrowsRepeatLeftRightIcon variant="small" />;
  return <FunctionIcon variant="small" />;
}

function statusCaption(status: ActivityRowStatus) {
  if (status === 'pending') return 'Pending';
  if (status === 'failed') return 'Failed';
  return null;
}

interface ActivityRowProps {
  icon: ActivityRowIcon;
  title: string;
  subtitle: string;
  status: ActivityRowStatus;
  trailing: ActivityTrailing | null;
  selected?: boolean;
  onSelect?(): void;
}

export function ActivityRow({
  icon,
  title,
  subtitle,
  status,
  trailing,
  selected = false,
  onSelect,
}: ActivityRowProps) {
  const caption = statusCaption(status);
  const content = (
    <>
      <Flex
        alignItems="center"
        justifyContent="center"
        width="40px"
        height="40px"
        borderRadius="round"
        bg="ink.component-background-default"
        color="ink.text-primary"
        flexShrink={0}
      >
        <RowIcon icon={icon} />
      </Flex>
      <Flex direction="column" flex="1" minWidth="0">
        <styled.span textStyle="label.02" color="ink.text-primary" truncate>
          {title}
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued" truncate>
          {subtitle}
        </styled.span>
        {caption ? (
          <styled.span
            textStyle="caption.02"
            color={status === 'failed' ? 'red.action-primary-default' : 'yellow.text-primary'}
          >
            {caption}
          </styled.span>
        ) : null}
      </Flex>
      {trailing ? (
        <Flex direction="column" alignItems="flex-end" flexShrink={0}>
          <styled.span
            textStyle="label.02"
            color={
              trailing.tone === 'received' ? 'green.action-primary-default' : 'ink.text-primary'
            }
          >
            {trailing.primary}
          </styled.span>
          {trailing.secondary ? (
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {trailing.secondary}
            </styled.span>
          ) : null}
        </Flex>
      ) : null}
    </>
  );

  if (!onSelect) {
    return (
      <Flex alignItems="center" gap="space.03" px="space.03" py="space.03">
        {content}
      </Flex>
    );
  }

  return (
    <styled.button
      type="button"
      onClick={onSelect}
      display="flex"
      alignItems="center"
      gap="space.03"
      width="100%"
      px="space.03"
      py="space.03"
      borderRadius="sm"
      textAlign="left"
      cursor="pointer"
      bg={selected ? 'ink.component-background-pressed' : 'transparent'}
      _hover={{ bg: 'ink.component-background-hover' }}
      aria-pressed={selected}
    >
      {content}
    </styled.button>
  );
}
