import type { ReactNode } from 'react';

import { Box, Flex, Grid, Stack, styled } from 'leather-styles/jsx';

import { Button, Callout, Eye1ClosedIcon, Input, KeyIcon, Link } from '@leather.io/ui';

import {
  type CompliancePlatform,
  type MockDappRequestId,
  type MockWallet,
  backupLinkLabel,
  complianceCopy,
  complianceEmail,
  mockDappOrigin,
  mockDappRequests,
  mockMultisigReview,
  mockSecretKey,
  mockSendReview,
  walletsWithBackup,
} from './compliance-content';
import {
  ActionRow,
  DetailRow,
  LockMark,
  Screen,
  ScreeningActions,
} from './compliance-screen-parts';

interface LockoutScreenProps {
  onWhy?(): void;
  onDispute?(): void;
}

export function LockoutScreen({ onWhy, onDispute }: LockoutScreenProps) {
  const copy = complianceCopy.lockout;
  return (
    <Screen
      footer={
        <>
          <Button size="lg" width="100%" onClick={onWhy}>
            {copy.why}
          </Button>
          <Button size="lg" width="100%" variant="outline" onClick={onDispute}>
            {copy.dispute}
          </Button>
        </>
      }
    >
      <Stack flex={1} gap="space.04" alignItems="center" justifyContent="center" textAlign="center">
        <LockMark />
        <styled.h1 textStyle="heading.03">{copy.title}</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued" maxWidth="34ch">
          {copy.body}
        </styled.p>
      </Stack>
    </Screen>
  );
}

interface WhyLockedScreenProps {
  wallets: MockWallet[];
  onBack?(): void;
  onBackup?(wallet: MockWallet): void;
}

export function WhyLockedScreen({ wallets, onBack, onBackup }: WhyLockedScreenProps) {
  const copy = complianceCopy.why;
  const backupWallets = walletsWithBackup(wallets);
  return (
    <Screen onBack={onBack}>
      <Stack gap="space.04">
        <styled.h1 textStyle="heading.03">{copy.title}</styled.h1>
        <styled.p textStyle="body.02">{copy.body}</styled.p>
        <styled.p textStyle="body.02">{copy.funds}</styled.p>
        {backupWallets.length > 0 ? (
          <Stack gap="space.02" pt="space.03">
            {backupWallets.map(wallet => (
              <Flex key={wallet.id} alignItems="center" gap="space.02">
                <KeyIcon variant="small" />
                <Link variant="underlined" onClick={() => onBackup?.(wallet)}>
                  {backupLinkLabel(wallet.name)}
                </Link>
              </Flex>
            ))}
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {copy.backupNote}
            </styled.span>
          </Stack>
        ) : null}
      </Stack>
    </Screen>
  );
}

export type KeyBackupStage = 'password' | 'hidden' | 'revealed';

interface KeyBackupScreenProps {
  stage: KeyBackupStage;
  onBack?(): void;
  onUnlock?(): void;
  onReveal?(): void;
  onDone?(): void;
}

export function KeyBackupScreen({
  stage,
  onBack,
  onUnlock,
  onReveal,
  onDone,
}: KeyBackupScreenProps) {
  const copy = complianceCopy.keyBackup;

  if (stage === 'password') {
    return (
      <Screen
        onBack={onBack}
        footer={
          <Button size="lg" width="100%" onClick={onUnlock}>
            {copy.continue}
          </Button>
        }
      >
        <Stack gap="space.04">
          <styled.h1 textStyle="heading.03">{copy.title}</styled.h1>
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {copy.passwordPrompt}
          </styled.p>
          <Input.Root data-shrink>
            <Input.Label>{copy.passwordLabel}</Input.Label>
            <Input.Field type="password" defaultValue="playground" />
          </Input.Root>
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen
      onBack={onBack}
      footer={
        <Button size="lg" width="100%" disabled={stage !== 'revealed'} onClick={onDone}>
          {copy.done}
        </Button>
      }
    >
      <Stack gap="space.04">
        <styled.h1 textStyle="heading.03">{copy.keyTitle}</styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {copy.warning}
        </styled.p>
        <Box position="relative">
          <Grid
            gridTemplateColumns="repeat(3, 1fr)"
            gap="space.02"
            filter={stage === 'revealed' ? 'none' : 'blur(6px)'}
            aria-hidden={stage !== 'revealed'}
          >
            {mockSecretKey.map((word, index) => (
              <Flex
                key={word}
                gap="space.01"
                px="space.02"
                py="space.02"
                borderRadius="xs"
                bg="ink.component-background-default"
              >
                <styled.span textStyle="label.03" color="ink.text-subdued">
                  {index + 1}
                </styled.span>
                <styled.span textStyle="label.03">{word}</styled.span>
              </Flex>
            ))}
          </Grid>
          {stage === 'hidden' ? (
            <styled.button
              type="button"
              onClick={onReveal}
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap="space.02"
              textStyle="label.02"
              cursor="pointer"
            >
              <Eye1ClosedIcon variant="small" />
              {copy.reveal}
            </styled.button>
          ) : null}
        </Box>
      </Stack>
    </Screen>
  );
}

export type GateState = 'clean' | 'screening' | 'refused' | 'no-answer';

type RefusalKind = 'recipient' | 'counterparty' | 'multisig';

const refusalCopy: Record<RefusalKind, { title: string; body: string }> = {
  recipient: complianceCopy.recipientRefused,
  counterparty: complianceCopy.counterpartyRefused,
  multisig: complianceCopy.multisigRefused,
};

interface GateHandlers {
  onPrimary?(): void;
  onCancel?(): void;
  onClose?(): void;
  onRetry?(): void;
}

interface GatedReviewProps extends GateHandlers {
  title: string;
  state: GateState;
  refusal: RefusalKind;
  primaryLabel: string;
  platform: CompliancePlatform;
  children: ReactNode;
}

function GatedReview({
  title,
  state,
  refusal,
  primaryLabel,
  platform,
  onPrimary,
  onCancel,
  onClose,
  onRetry,
  children,
}: GatedReviewProps) {
  const actions = complianceCopy.actions;

  function renderNotice() {
    if (state === 'refused') {
      return (
        <Callout variant="error" title={refusalCopy[refusal].title} width="100%">
          {refusalCopy[refusal].body}
        </Callout>
      );
    }
    if (state === 'no-answer') {
      const noAnswer = complianceCopy.noAnswer;
      return (
        <Callout variant="warning" title={noAnswer.title} width="100%">
          {noAnswer.body} {noAnswer.supportPrefix}
          <Link variant="underlined" href={complianceEmail('support', platform).href}>
            {noAnswer.supportLink}
          </Link>
          {noAnswer.supportSuffix}
        </Callout>
      );
    }
    return null;
  }

  function renderActions() {
    switch (state) {
      case 'screening':
        return <ScreeningActions />;
      case 'refused':
        return (
          <Button size="lg" width="100%" onClick={onClose}>
            {actions.close}
          </Button>
        );
      case 'no-answer':
        return (
          <ActionRow>
            <Button size="lg" variant="outline" onClick={onCancel}>
              {actions.cancel}
            </Button>
            <Button size="lg" onClick={onRetry}>
              {actions.tryAgain}
            </Button>
          </ActionRow>
        );
      default:
        return (
          <ActionRow>
            <Button size="lg" variant="outline" onClick={onCancel}>
              {actions.cancel}
            </Button>
            <Button size="lg" onClick={onPrimary}>
              {primaryLabel}
            </Button>
          </ActionRow>
        );
    }
  }

  return (
    <Flex direction="column" flex={1} minHeight={0}>
      <Screen title={title}>{children}</Screen>
      {renderNotice()}
      <Box px="space.05" py="space.04" borderTop="default">
        {renderActions()}
      </Box>
    </Flex>
  );
}

interface ReviewScreenProps extends GateHandlers {
  state: GateState;
  platform?: CompliancePlatform;
}

export function SendReviewScreen({
  state,
  platform = 'extension',
  ...handlers
}: ReviewScreenProps) {
  return (
    <GatedReview
      title={complianceCopy.review.sendTitle}
      state={state}
      refusal="recipient"
      primaryLabel={complianceCopy.review.send}
      platform={platform}
      {...handlers}
    >
      <Stack gap="space.01" alignItems="center" py="space.05">
        <styled.span textStyle="heading.03">{mockSendReview.amount}</styled.span>
        <styled.span textStyle="body.02" color="ink.text-subdued">
          {mockSendReview.fiat}
        </styled.span>
      </Stack>
      <DetailRow label={complianceCopy.review.from} value={mockSendReview.from} />
      <DetailRow label={complianceCopy.review.to} value={mockSendReview.recipient} />
      <DetailRow label={complianceCopy.review.fee} value={mockSendReview.fee} />
      <DetailRow label={complianceCopy.review.arrives} value={mockSendReview.arrival} />
    </GatedReview>
  );
}

export function MultisigReviewScreen({
  state,
  platform = 'extension',
  ...handlers
}: ReviewScreenProps) {
  return (
    <GatedReview
      title={complianceCopy.review.multisigTitle}
      state={state}
      refusal="multisig"
      primaryLabel={complianceCopy.review.propose}
      platform={platform}
      {...handlers}
    >
      <Stack gap="space.01" alignItems="center" py="space.05">
        <styled.span textStyle="heading.03">{mockMultisigReview.amount}</styled.span>
        <styled.span textStyle="body.02" color="ink.text-subdued">
          {mockMultisigReview.name} · {mockMultisigReview.threshold}
        </styled.span>
      </Stack>
      {mockMultisigReview.members.map(member => (
        <DetailRow
          key={member.name}
          label={member.name}
          value={
            <styled.span color={member.flagged ? 'red.action-primary-default' : undefined}>
              {member.address}
            </styled.span>
          }
        />
      ))}
    </GatedReview>
  );
}

interface DappApprovalScreenProps extends ReviewScreenProps {
  request: MockDappRequestId;
}

export function DappApprovalScreen({
  request,
  state,
  platform = 'extension',
  ...handlers
}: DappApprovalScreenProps) {
  const details = mockDappRequests[request];
  return (
    <GatedReview
      title={details.title}
      state={state}
      refusal="counterparty"
      primaryLabel={complianceCopy.review.approve}
      platform={platform}
      {...handlers}
    >
      <Stack gap="space.01" py="space.04">
        <styled.span textStyle="label.02">{mockDappOrigin}</styled.span>
        <styled.code textStyle="caption.02" color="ink.text-subdued">
          {details.method}
        </styled.code>
      </Stack>
      {details.rows.map(row => (
        <DetailRow key={row.label} label={row.label} value={row.value} />
      ))}
    </GatedReview>
  );
}
