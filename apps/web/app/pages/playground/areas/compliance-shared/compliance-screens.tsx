import { useState } from 'react';

import { Box, Flex, Grid, Stack, styled } from 'leather-styles/jsx';

import { Button, Callout, Link, SkeletonLoader } from '@leather.io/ui';

import {
  type ComplianceReview,
  type ComplianceWallet,
  complianceCopy,
  getBackupWallets,
  mockAccount,
  mockSecretKey,
} from './compliance-content';
import { AssetRow, LockSticker, ReviewSummary, ScreenShell } from './compliance-screen-parts';

export type ComplianceGate = 'clean' | 'screening' | 'flagged' | 'no-answer';

interface LockoutScreenProps {
  onWhy?(): void;
  onDispute?(): void;
}

export function LockoutScreen({ onWhy, onDispute }: LockoutScreenProps) {
  const copy = complianceCopy.lockout;
  return (
    <ScreenShell
      footer={
        <Stack gap="space.03">
          <Button fullWidth onClick={onWhy}>
            {copy.why}
          </Button>
          <Button fullWidth variant="outline" onClick={onDispute}>
            {copy.dispute}
          </Button>
        </Stack>
      }
    >
      <Stack gap="space.05" flex="1" justifyContent="center" alignItems="center" textAlign="center">
        <LockSticker />
        <Stack gap="space.03">
          <styled.h2 textStyle="heading.04">{copy.title}</styled.h2>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {copy.body}
          </styled.p>
        </Stack>
      </Stack>
    </ScreenShell>
  );
}

interface WhyLockedScreenProps {
  wallets: readonly ComplianceWallet[];
  onBack?(): void;
  onBackup?(wallet: ComplianceWallet): void;
}

export function WhyLockedScreen({ wallets, onBack, onBackup }: WhyLockedScreenProps) {
  const copy = complianceCopy.why;
  const backupWallets = getBackupWallets(wallets);
  return (
    <ScreenShell onBack={onBack}>
      <Stack gap="space.03">
        <styled.h2 textStyle="heading.04">{copy.title}</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {copy.body}
        </styled.p>
        <styled.p textStyle="body.02">{copy.funds}</styled.p>
      </Stack>
      {backupWallets.length > 0 && (
        <Stack gap="space.02">
          {backupWallets.map(wallet => (
            <Link
              key={wallet.id}
              data-testid="compliance-backup-link"
              textStyle="label.02"
              onClick={() => onBackup?.(wallet)}
            >
              {copy.backupLink(wallet.name)}
            </Link>
          ))}
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            {copy.backupNote}
          </styled.p>
        </Stack>
      )}
    </ScreenShell>
  );
}

interface KeyBackupScreenProps {
  walletName: string;
  onBack?(): void;
  onDone?(): void;
}

export function KeyBackupScreen({ walletName, onBack, onDone }: KeyBackupScreenProps) {
  const copy = complianceCopy.keyBackup;
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  if (!unlocked) {
    return (
      <ScreenShell
        onBack={onBack}
        footer={
          <Button fullWidth disabled={password.length === 0} onClick={() => setUnlocked(true)}>
            Continue
          </Button>
        }
      >
        <Stack gap="space.03">
          <styled.h2 textStyle="heading.04">{copy.title}</styled.h2>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {copy.prompt(walletName)}
          </styled.p>
        </Stack>
        <styled.input
          type="password"
          aria-label="Password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          height="48px"
          px="space.04"
          borderWidth={1}
          borderColor="ink.border-default"
          borderRadius="sm"
          textStyle="body.02"
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      onBack={onBack}
      footer={
        <Button fullWidth disabled={!revealed} onClick={onDone}>
          {copy.confirm}
        </Button>
      }
    >
      <Stack gap="space.03">
        <styled.h2 textStyle="heading.04">{copy.keyTitle(walletName)}</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {copy.warning}
        </styled.p>
      </Stack>
      <Box position="relative">
        <Grid
          gridTemplateColumns="repeat(2, minmax(0, 1fr))"
          gap="space.02"
          filter={revealed ? 'none' : 'blur(6px)'}
          aria-hidden={!revealed}
        >
          {mockSecretKey.map((word, index) => (
            <Flex
              key={word}
              gap="space.02"
              px="space.03"
              py="space.02"
              borderRadius="sm"
              bg="ink.component-background-default"
            >
              <styled.span textStyle="label.03" color="ink.text-subdued">
                {index + 1}
              </styled.span>
              <styled.span textStyle="label.03">{word}</styled.span>
            </Flex>
          ))}
        </Grid>
        {!revealed && (
          <Flex position="absolute" inset="0" alignItems="center" justifyContent="center">
            <Button
              size="sm"
              variant="outline"
              bg="ink.background-primary"
              onClick={() => setRevealed(true)}
            >
              {copy.reveal}
            </Button>
          </Flex>
        )}
      </Box>
    </ScreenShell>
  );
}

interface HomeScreenProps {
  isScreening?: boolean;
}

export function HomeScreen({ isScreening = false }: HomeScreenProps) {
  return (
    <ScreenShell title={mockAccount.name}>
      <Stack gap="space.01">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          Total balance
        </styled.span>
        <SkeletonLoader isLoading={isScreening} width="160px" height="36px">
          <styled.span textStyle="heading.03">{mockAccount.totalUsd}</styled.span>
        </SkeletonLoader>
      </Stack>
      <Stack gap="0">
        {mockAccount.assets.map(asset => (
          <SkeletonLoader
            key={asset.symbol}
            isLoading={isScreening}
            width="100%"
            height="56px"
            my="space.01"
          >
            <AssetRow {...asset} />
          </SkeletonLoader>
        ))}
      </Stack>
    </ScreenShell>
  );
}

interface ReviewScreenProps {
  review: ComplianceReview;
  gate: ComplianceGate;
  supportHref?: string;
  onApprove?(): void;
  onCancel?(): void;
  onClose?(): void;
  onRetry?(): void;
}

interface NoAnswerCalloutProps {
  supportHref?: string;
}

function NoAnswerCallout({ supportHref }: NoAnswerCalloutProps) {
  const copy = complianceCopy.noAnswer;
  return (
    <Callout variant="warning" title={copy.title}>
      {copy.body} {copy.supportPrefix}
      <Link href={supportHref} textStyle="caption.01">
        {copy.supportLink}
      </Link>
      {copy.supportSuffix}
    </Callout>
  );
}

function ReviewFooter({
  review,
  gate,
  onApprove,
  onCancel,
  onClose,
  onRetry,
}: Omit<ReviewScreenProps, 'supportHref'>) {
  const actions = complianceCopy.actions;

  if (gate === 'screening') {
    return (
      <Flex gap="space.03" data-testid="compliance-screening-footer">
        <SkeletonLoader isLoading width="100%" height="48px" borderRadius="round" />
        <SkeletonLoader isLoading width="100%" height="48px" borderRadius="round" />
      </Flex>
    );
  }

  if (gate === 'flagged') {
    return (
      <Button fullWidth onClick={onClose}>
        {actions.close}
      </Button>
    );
  }

  return (
    <Flex gap="space.03">
      <Button flex="1" variant="outline" onClick={onCancel}>
        {actions.cancel}
      </Button>
      {gate === 'no-answer' ? (
        <Button flex="1" onClick={onRetry}>
          {actions.tryAgain}
        </Button>
      ) : (
        <Button flex="1" onClick={onApprove}>
          {review.primaryAction}
        </Button>
      )}
    </Flex>
  );
}

function ReviewNotice({ review, gate, supportHref }: ReviewScreenProps) {
  if (gate === 'flagged') {
    const refusal = complianceCopy[review.refusal];
    return (
      <Callout variant="error" title={refusal.title}>
        {refusal.body}
      </Callout>
    );
  }
  if (gate === 'no-answer') return <NoAnswerCallout supportHref={supportHref} />;
  return null;
}

export function ReviewScreen(props: ReviewScreenProps) {
  return (
    <ScreenShell
      title={props.review.title}
      notice={<ReviewNotice {...props} />}
      footer={<ReviewFooter {...props} />}
    >
      <ReviewSummary review={props.review} />
    </ScreenShell>
  );
}
