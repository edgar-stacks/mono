import type { ReactNode } from 'react';

import { Box, Flex, Stack, styled } from 'leather-styles/jsx';

import { Button, Callout, LockIcon, SkeletonLoader } from '@leather.io/ui';

import { type ComplianceVerdict, complianceCopy } from './compliance-content';

const footerButtonHeight = '48px';

interface ScreenLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function ScreenLayout({ children, footer }: ScreenLayoutProps) {
  return (
    <Flex direction="column" height="100%" minHeight={0}>
      <Stack gap="space.05" flex={1} minHeight={0} overflowY="auto" px="space.05" py="space.05">
        {children}
      </Stack>
      {footer && <Stack flexShrink={0}>{footer}</Stack>}
    </Flex>
  );
}

interface ScreenTitleProps {
  title: string;
  caption?: string;
}

export function ScreenTitle({ title, caption }: ScreenTitleProps) {
  return (
    <Stack gap="space.02">
      <styled.h2 textStyle="heading.05" color="ink.text-primary">
        {title}
      </styled.h2>
      {caption && (
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {caption}
        </styled.p>
      )}
    </Stack>
  );
}

export function LockMark() {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      width="64px"
      height="64px"
      borderRadius="round"
      bg="red.background-secondary"
      color="red.action-primary-default"
    >
      <LockIcon />
    </Flex>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <Flex justifyContent="space-between" gap="space.04" py="space.02">
      <styled.span textStyle="label.03" color="ink.text-subdued" flexShrink={0}>
        {label}
      </styled.span>
      <styled.span
        textStyle="label.03"
        color="ink.text-primary"
        textAlign="right"
        wordBreak="break-all"
      >
        {value}
      </styled.span>
    </Flex>
  );
}

interface DetailListProps {
  children: ReactNode;
}

export function DetailList({ children }: DetailListProps) {
  return (
    <Box
      px="space.04"
      py="space.02"
      borderRadius="sm"
      borderWidth={1}
      borderColor="ink.border-default"
    >
      {children}
    </Box>
  );
}

interface FooterActionsProps {
  children: ReactNode;
}

export function FooterActions({ children }: FooterActionsProps) {
  return (
    <Flex gap="space.03" px="space.05" pt="space.04" pb="space.05">
      {children}
    </Flex>
  );
}

interface SupportLineProps {
  onContactSupport?(): void;
}

function SupportLine({ onContactSupport }: SupportLineProps) {
  return (
    <>
      {complianceCopy.noAnswer.supportPrefix}
      <styled.button
        type="button"
        onClick={onContactSupport}
        textDecoration="underline"
        cursor="pointer"
        textStyle="caption.01"
      >
        {complianceCopy.noAnswer.supportLink}
      </styled.button>
      {complianceCopy.noAnswer.supportSuffix}
    </>
  );
}

interface Refusal {
  title: string;
  body: string;
}

interface GateFooterProps {
  verdict: ComplianceVerdict;
  primaryLabel: string;
  refusal: Refusal;
  onPrimary?(): void;
  onCancel?(): void;
  onClose?(): void;
  onRetry?(): void;
  onContactSupport?(): void;
}

export function GateFooter({
  verdict,
  primaryLabel,
  refusal,
  onPrimary,
  onCancel,
  onClose,
  onRetry,
  onContactSupport,
}: GateFooterProps) {
  if (verdict === 'screening') {
    return (
      <FooterActions>
        <SkeletonLoader isLoading width="100%" height={footerButtonHeight} borderRadius="round" />
        <SkeletonLoader isLoading width="100%" height={footerButtonHeight} borderRadius="round" />
      </FooterActions>
    );
  }

  if (verdict === 'flagged') {
    return (
      <>
        <Callout variant="error" title={refusal.title} width="100%">
          {refusal.body}
        </Callout>
        <FooterActions>
          <Button size="lg" variant="solid" flex={1} onClick={onClose}>
            {complianceCopy.actions.close}
          </Button>
        </FooterActions>
      </>
    );
  }

  if (verdict === 'no-answer') {
    return (
      <>
        <Callout variant="warning" title={complianceCopy.noAnswer.title} width="100%">
          {complianceCopy.noAnswer.body} <SupportLine onContactSupport={onContactSupport} />
        </Callout>
        <FooterActions>
          <Button size="lg" variant="outline" flex={1} onClick={onCancel}>
            {complianceCopy.actions.cancel}
          </Button>
          <Button size="lg" variant="solid" flex={1} onClick={onRetry}>
            {complianceCopy.actions.tryAgain}
          </Button>
        </FooterActions>
      </>
    );
  }

  return (
    <FooterActions>
      <Button size="lg" variant="outline" flex={1} onClick={onCancel}>
        {complianceCopy.actions.cancel}
      </Button>
      <Button size="lg" variant="solid" flex={1} onClick={onPrimary}>
        {primaryLabel}
      </Button>
    </FooterActions>
  );
}
