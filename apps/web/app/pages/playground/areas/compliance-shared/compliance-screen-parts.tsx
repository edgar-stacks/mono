import type { ReactNode } from 'react';

import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import { ArrowLeftIcon, LockIcon } from '@leather.io/ui';

import type { ComplianceReview } from './compliance-content';

interface ScreenShellProps {
  title?: string;
  onBack?(): void;
  notice?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function ScreenShell({ title, onBack, notice, footer, children }: ScreenShellProps) {
  const hasHeader = Boolean(title) || Boolean(onBack);
  return (
    <Stack gap="0" height="100%">
      {hasHeader && (
        <Flex alignItems="center" gap="space.02" px="space.05" pt="space.04" flexShrink={0}>
          {onBack && (
            <styled.button type="button" aria-label="Back" cursor="pointer" onClick={onBack}>
              <ArrowLeftIcon />
            </styled.button>
          )}
          {title && <styled.span textStyle="label.02">{title}</styled.span>}
        </Flex>
      )}
      <Stack gap="space.05" flex="1" minHeight="0" overflowY="auto" px="space.05" py="space.05">
        {children}
      </Stack>
      {notice && <Box flexShrink={0}>{notice}</Box>}
      {footer && (
        <Box
          px="space.05"
          py="space.04"
          borderTopWidth={1}
          borderColor="ink.border-default"
          flexShrink={0}
        >
          {footer}
        </Box>
      )}
    </Stack>
  );
}

export function LockSticker() {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      width="72px"
      height="72px"
      borderRadius="round"
      bg="red.background-secondary"
      color="red.action-primary-default"
      transform="rotate(-8deg)"
    >
      <LockIcon />
    </Flex>
  );
}

interface ReviewSummaryProps {
  review: ComplianceReview;
}

export function ReviewSummary({ review }: ReviewSummaryProps) {
  return (
    <Stack gap="space.04">
      {review.origin && (
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Requested by {review.origin}
        </styled.span>
      )}
      <Stack gap="space.01">
        <styled.span textStyle="heading.04">{review.amount}</styled.span>
        <styled.span textStyle="body.02" color="ink.text-subdued">
          {review.amountUsd}
        </styled.span>
      </Stack>
      <Stack gap="space.03" borderTopWidth={1} borderColor="ink.border-default" pt="space.04">
        {review.rows.map(row => (
          <Flex key={row.label} justifyContent="space-between" gap="space.03">
            <styled.span textStyle="label.03" color="ink.text-subdued">
              {row.label}
            </styled.span>
            <styled.span textStyle="label.03" textAlign="right">
              {row.value}
            </styled.span>
          </Flex>
        ))}
      </Stack>
    </Stack>
  );
}

interface AssetRowProps {
  symbol: string;
  name: string;
  amount: string;
  usd: string;
}

export function AssetRow({ symbol, name, amount, usd }: AssetRowProps) {
  return (
    <Flex alignItems="center" gap="space.03" py="space.02">
      <Flex
        alignItems="center"
        justifyContent="center"
        width="40px"
        height="40px"
        borderRadius="round"
        bg="ink.component-background-default"
        flexShrink={0}
      >
        <styled.span textStyle="caption.02">{symbol}</styled.span>
      </Flex>
      <Stack gap="0" flex="1" minWidth="0">
        <styled.span textStyle="label.02">{name}</styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {amount}
        </styled.span>
      </Stack>
      <styled.span textStyle="label.02">{usd}</styled.span>
    </Flex>
  );
}
