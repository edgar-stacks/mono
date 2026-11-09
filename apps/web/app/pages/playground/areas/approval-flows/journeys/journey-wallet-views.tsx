import { useState } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { Button, CheckmarkCircleIcon, ErrorCircleIcon, PendingIndicatorIcon } from '@leather.io/ui';

import type { ApprovalDirection } from '../directions/direction-registry';
import { ApprovalLedgerSheet } from '../pattern/approval-ledger-sheet';
import { ApprovalScreen } from '../pattern/approval-screen';
import { formatAssetAmount } from '../scenarios/approval-assets';
import type { ApprovalRequest } from '../scenarios/approval-scenario.types';
import type { JourneyAction, JourneyRun } from './journey-state';

export type WalletActionType = Exclude<JourneyAction['type'], 'open' | 'set-outcome' | 'settle'>;

interface ResultCopy {
  tone: 'success' | 'pending' | 'failure';
  title: string;
  body: string;
}

function walletResultCopy(
  run: JourneyRun,
  request: ApprovalRequest,
  appName: string
): ResultCopy | null {
  switch (run.phase) {
    case 'connected':
      return {
        tone: 'success',
        title: 'Connected',
        body: `${appName} can now see ${request.account.label}. Nothing was signed.`,
      };
    case 'signed':
      return {
        tone: 'success',
        title: 'Signed',
        body: `Your signature went back to ${appName}. Nothing was broadcast.`,
      };
    case 'pending':
      return {
        tone: 'pending',
        title: 'Submitted',
        body: 'Waiting for confirmation. It shows as pending in Activity until then.',
      };
    case 'confirmed':
      return {
        tone: 'success',
        title: 'Confirmed',
        body: 'The transaction confirmed and your balance is updated.',
      };
    case 'failed':
      if (run.failure === 'pre-broadcast') {
        return {
          tone: 'failure',
          title: 'Not broadcast',
          body: 'The network refused the transaction before broadcast. No fee was charged.',
        };
      }
      return {
        tone: 'failure',
        title: 'Failed on-chain',
        body: run.plan.fee
          ? `The transaction failed. The ${formatAssetAmount(run.plan.fee)} fee was still charged.`
          : 'The transaction failed.',
      };
    default:
      return null;
  }
}

function ResultIcon({ tone }: { tone: ResultCopy['tone'] }) {
  if (tone === 'pending') return <PendingIndicatorIcon size={24} />;
  if (tone === 'failure') return <ErrorCircleIcon color="red.action-primary-default" />;
  return <CheckmarkCircleIcon color="green.action-primary-default" />;
}

interface WalletResultProps {
  copy: ResultCopy;
  appName: string;
  canRetry: boolean;
  onRetry(): void;
  onClose(): void;
}

function WalletResult({ copy, appName, canRetry, onRetry, onClose }: WalletResultProps) {
  return (
    <Flex direction="column" height="100%" p="space.05" gap="space.04" data-result={copy.tone}>
      <Flex
        direction="column"
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap="space.03"
        textAlign="center"
      >
        <ResultIcon tone={copy.tone} />
        <styled.h2 textStyle="heading.04" color="ink.text-primary">
          {copy.title}
        </styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {copy.body}
        </styled.p>
      </Flex>
      <Flex direction="column" gap="space.02">
        {canRetry ? (
          <Button type="button" fullWidth onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <Button type="button" variant={canRetry ? 'outline' : 'solid'} fullWidth onClick={onClose}>
          Back to {appName}
        </Button>
      </Flex>
    </Flex>
  );
}

interface DeviceStepProps {
  request: ApprovalRequest;
  direction: ApprovalDirection;
  requestKey: string;
  onAction(type: WalletActionType): void;
}

function DeviceStep({ request, direction, requestKey, onAction }: DeviceStepProps) {
  const [connected, setConnected] = useState(false);
  return (
    <Box position="relative" height="100%">
      <ApprovalScreen
        request={request}
        direction={direction}
        requestKey={requestKey}
        interactive={false}
      />
      <Flex position="absolute" inset={0} alignItems="flex-end" bg="rgba(12, 12, 13, 0.32)">
        <Box width="100%">
          <ApprovalLedgerSheet
            state={connected ? 'review' : 'connect'}
            chain={request.chain}
            onConnected={() => setConnected(true)}
            onApprove={() => onAction('device-approve')}
            onReject={() => onAction('device-reject')}
            onClose={() => onAction('cancel')}
          />
        </Box>
      </Flex>
    </Box>
  );
}

interface JourneyWalletViewProps {
  run: JourneyRun;
  request: ApprovalRequest;
  appName: string;
  direction: ApprovalDirection;
  animateHeader: boolean;
  onAction(type: WalletActionType): void;
  onClose(): void;
}

export function JourneyWalletView({
  run,
  request,
  appName,
  direction,
  animateHeader,
  onAction,
  onClose,
}: JourneyWalletViewProps) {
  const requestKey = run.requestId ?? run.runId;

  if (run.phase === 'review') {
    return (
      <ApprovalScreen
        request={request}
        direction={direction}
        requestKey={requestKey}
        animateHeader={animateHeader}
        deviceRejected={run.deviceRejected}
        onConfirm={() => onAction('approve')}
        onCancel={() => onAction('cancel')}
      />
    );
  }

  if (run.phase === 'device') {
    return (
      <DeviceStep
        key={requestKey}
        request={request}
        direction={direction}
        requestKey={requestKey}
        onAction={onAction}
      />
    );
  }

  const copy = walletResultCopy(run, request, appName);
  if (!copy) return null;
  return (
    <WalletResult
      copy={copy}
      appName={appName}
      canRetry={run.failure === 'pre-broadcast'}
      onRetry={() => onAction('retry')}
      onClose={onClose}
    />
  );
}
