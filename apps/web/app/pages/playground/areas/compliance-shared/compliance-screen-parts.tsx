import type { ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { ChevronLeftIcon, LockIcon, SkeletonLoader } from '@leather.io/ui';

interface ScreenProps {
  title?: string;
  onBack?(): void;
  footer?: ReactNode;
  children: ReactNode;
}

export function Screen({ title, onBack, footer, children }: ScreenProps) {
  return (
    <Flex direction="column" flex={1} minHeight={0} width="100%">
      {title || onBack ? (
        <Flex alignItems="center" gap="space.02" px="space.04" height="56px" flexShrink={0}>
          {onBack ? (
            <styled.button
              type="button"
              aria-label="Back"
              onClick={onBack}
              display="flex"
              p="space.01"
              borderRadius="sm"
              cursor="pointer"
              _hover={{ bg: 'ink.component-background-hover' }}
            >
              <ChevronLeftIcon />
            </styled.button>
          ) : null}
          {title ? <styled.span textStyle="label.01">{title}</styled.span> : null}
        </Flex>
      ) : null}
      <Flex direction="column" flex={1} minHeight={0} overflowY="auto" px="space.05" pb="space.05">
        {children}
      </Flex>
      {footer ? (
        <Stack gap="space.03" px="space.05" py="space.04" borderTop="default" flexShrink={0}>
          {footer}
        </Stack>
      ) : null}
    </Flex>
  );
}

export function LockMark() {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      width="72px"
      height="72px"
      borderRadius="round"
      bg="ink.component-background-default"
      color="ink.text-primary"
      transform="rotate(-6deg)"
    >
      <LockIcon />
    </Flex>
  );
}

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <Flex justifyContent="space-between" alignItems="baseline" gap="space.04" py="space.02">
      <styled.span textStyle="label.03" color="ink.text-subdued" flexShrink={0}>
        {label}
      </styled.span>
      <styled.span textStyle="label.02" textAlign="right" truncate>
        {value}
      </styled.span>
    </Flex>
  );
}

interface ActionRowProps {
  children: ReactNode;
}

export function ActionRow({ children }: ActionRowProps) {
  return (
    <Flex gap="space.02" css={{ '& > *': { flex: 1 } }}>
      {children}
    </Flex>
  );
}

export function ScreeningActions() {
  return (
    <Flex gap="space.02" aria-label="Screening" aria-busy="true">
      <SkeletonLoader isLoading flex={1} height="48px" borderRadius="round" />
      <SkeletonLoader isLoading flex={1} height="48px" borderRadius="round" />
    </Flex>
  );
}
