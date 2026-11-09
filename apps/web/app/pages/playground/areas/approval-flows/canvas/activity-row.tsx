import { cva } from 'leather-styles/css';
import { Box, Flex, styled } from 'leather-styles/jsx';

import { ErrorCircleIcon, FunctionIcon, PendingIndicatorIcon } from '@leather.io/ui';

import type { ActivityPresentation, ActivityStatus } from '../scenarios/activity-list-fixtures';

const trailingStyles = cva({
  base: { textStyle: 'label.03', textAlign: 'right' },
  variants: {
    tone: {
      positive: { color: 'green.action-primary-default' },
      negative: { color: 'ink.text-primary' },
      neutral: { color: 'ink.text-subdued' },
    },
  },
});

function StatusIcon({ status }: { status: ActivityStatus }) {
  if (status === 'pending') return <PendingIndicatorIcon size={16} />;
  if (status === 'failed')
    return <ErrorCircleIcon variant="small" color="red.action-primary-default" />;
  return <FunctionIcon variant="small" color="ink.text-primary" />;
}

interface ActivityRowProps {
  presentation: ActivityPresentation;
  time: string;
  status: ActivityStatus;
  expanded?: boolean;
  onToggle?(): void;
}

export function ActivityRow({ presentation, time, status, expanded, onToggle }: ActivityRowProps) {
  const { title, caption, trailing } = presentation;
  return (
    <styled.button
      type="button"
      onClick={onToggle}
      aria-expanded={onToggle ? expanded : undefined}
      display="flex"
      alignItems="center"
      gap="space.03"
      width="100%"
      p="space.03"
      borderRadius="sm"
      textAlign="left"
      cursor={onToggle ? 'pointer' : 'default'}
      _hover={{ bg: 'ink.component-background-hover' }}
    >
      <Flex
        alignItems="center"
        justifyContent="center"
        width="36px"
        height="36px"
        flexShrink={0}
        borderRadius="round"
        bg="ink.background-secondary"
      >
        <StatusIcon status={status} />
      </Flex>
      <Flex direction="column" flex={1} minWidth={0}>
        <styled.span textStyle="label.02" color="ink.text-primary" truncate>
          {title}
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued" truncate>
          {caption} · {time}
        </styled.span>
      </Flex>
      {trailing ? (
        <Flex direction="column" alignItems="flex-end" flexShrink={0}>
          <span className={trailingStyles({ tone: trailing.tone })}>{trailing.primary}</span>
          {trailing.secondary ? (
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {trailing.secondary}
            </styled.span>
          ) : null}
        </Flex>
      ) : (
        <Box aria-hidden />
      )}
    </styled.button>
  );
}
