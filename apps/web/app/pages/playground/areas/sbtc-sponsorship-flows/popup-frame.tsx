import type { ReactNode } from 'react';

import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import { ArrowLeftIcon, Badge, BasicTooltip, IconButton } from '@leather.io/ui';

const popupWidth = '392px';
const popupMinHeight = '600px';
const sponsoredTooltip =
  'A Leather sponsor pays the STX network fee for this transaction. In return, the sBTC fee shown is included in your transfer and goes to the sponsor.';

interface PopupFrameProps {
  title: string;
  onBack?(): void;
  footer?: ReactNode;
  children: ReactNode;
}

export function PopupFrame({ title, onBack, footer, children }: PopupFrameProps) {
  return (
    <Stack
      width={popupWidth}
      minHeight={popupMinHeight}
      gap="0"
      borderWidth={1}
      borderColor="ink.border-default"
      borderRadius="md"
      bg="ink.background-primary"
      overflow="hidden"
      flexShrink={0}
    >
      <Flex alignItems="center" gap="space.02" px="space.04" py="space.03" minHeight="56px">
        {onBack && <IconButton icon={<ArrowLeftIcon />} label="Back" onClick={() => onBack()} />}
        <styled.h3 textStyle="heading.05">{title}</styled.h3>
      </Flex>
      <Stack flex="1" gap="space.04" px="space.05" py="space.04">
        {children}
      </Stack>
      {footer && (
        <Box px="space.05" py="space.04" borderTopWidth={1} borderColor="ink.border-default">
          {footer}
        </Box>
      )}
    </Stack>
  );
}

export function SponsoredBadge() {
  return (
    <BasicTooltip asChild label={sponsoredTooltip}>
      <styled.span display="inline-flex" cursor="help" tabIndex={0}>
        <Badge variant="info" label="Sponsored" size="sm" />
      </styled.span>
    </BasicTooltip>
  );
}

interface DetailRowProps {
  label: string;
  value: ReactNode;
  badge?: ReactNode;
}

export function DetailRow({ label, value, badge }: DetailRowProps) {
  return (
    <Flex justifyContent="space-between" alignItems="center" gap="space.03" py="space.02">
      <Flex alignItems="center" gap="space.02">
        <styled.span textStyle="label.02" color="ink.text-subdued">
          {label}
        </styled.span>
        {badge}
      </Flex>
      <styled.span textStyle="label.02" textAlign="right" wordBreak="break-all">
        {value}
      </styled.span>
    </Flex>
  );
}
