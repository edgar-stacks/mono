import { type ReactNode, useEffect, useState } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { Spinner } from '@leather.io/ui';

import type { ApprovalDirection } from '../directions/direction-types';
import type { ConfirmMode } from '../pattern/approval-footer';
import { ApprovalLedgerSheet, type LedgerSheetPhase } from '../pattern/approval-ledger-sheet';
import { ApprovalScreen } from '../pattern/approval-screen';
import { formatAssetAmount } from '../scenarios/approval-assets';
import type { ApprovalRequest } from '../scenarios/approval-model';
import type { JourneyAction, JourneyRun } from './journey-state';

export interface JourneyResult {
  title: string;
  body: string;
  tone: 'progress' | 'success' | 'neutral' | 'failure';
}

function signedResult(request: ApprovalRequest): JourneyResult {
  if (request.kind === 'message') {
    return {
      title: 'Signature received',
      body: `${request.requester.name} has your signature. Nothing was broadcast and no fee was charged.`,
      tone: 'success',
    };
  }
  if (request.vault) {
    const signed = request.vault.signers.filter(signer => signer.signed).length + 1;
    return {
      title: 'Signature added',
      body: `${Math.min(signed, request.vault.threshold)} of ${request.vault.threshold} signatures for ${request.vault.name}. Nothing was broadcast.`,
      tone: 'success',
    };
  }
  return {
    title: 'Signed transaction received',
    body: `${request.requester.name} decides when to broadcast it. Leather records nothing in Activity and no fee is charged yet.`,
    tone: 'success',
  };
}

function failedResult(run: JourneyRun, request: ApprovalRequest): JourneyResult {
  if (run.failure?.phase === 'pre-broadcast') {
    return {
      title: 'Couldn’t broadcast',
      body: 'The network refused the transaction before it was sent. Nothing moved and no fee was charged.',
      tone: 'failure',
    };
  }
  const fee = request.fee ? formatAssetAmount(request.fee.value) : 'The fee';
  return {
    title: 'Failed on chain',
    body: `The transaction was mined but failed. ${fee} was charged; nothing else moved.`,
    tone: 'failure',
  };
}

export function describeJourneyResult(
  run: JourneyRun,
  request: ApprovalRequest
): JourneyResult | null {
  switch (run.stage) {
    case 'review':
    case 'device':
    case 'signing':
    case 'broadcasting':
      return {
        title: 'Waiting for Leather',
        body: 'Approve or cancel the request in the Leather popover.',
        tone: 'progress',
      };
    case 'connected':
      return {
        title: 'Connected',
        body: `${request.requester.name} can now see your addresses and send you requests.`,
        tone: 'success',
      };
    case 'signed':
      return signedResult(request);
    case 'pending':
      return {
        title: 'Transaction submitted',
        body: 'Waiting for confirmation. Balances change once it confirms. Track it in Leather Activity.',
        tone: 'progress',
      };
    case 'confirmed':
      return {
        title: 'Confirmed',
        body: 'The transaction confirmed and your balances updated.',
        tone: 'success',
      };
    case 'failed':
      return failedResult(run, request);
    case 'cancelled':
      return run.cancelledOnDevice
        ? {
            title: 'Rejected on Ledger',
            body: 'You rejected the request on your device. Nothing was signed.',
            tone: 'neutral',
          }
        : {
            title: 'Request cancelled',
            body: `You declined in Leather. ${request.requester.name} hears that nothing was signed.`,
            tone: 'neutral',
          };
    default:
      return null;
  }
}

export function deviceLinesFor(request: ApprovalRequest) {
  const lines = [request.kind === 'message' ? 'Sign message' : 'Review transaction'];
  if (request.contractCall) lines.push(request.contractCall.functionName);
  const [primary] = request.movements;
  if (primary) {
    lines.push(
      `${primary.direction === 'out' ? 'Send' : 'Receive'} ${formatAssetAmount(primary.value)}`
    );
  }
  if (request.fee) lines.push(`Fee ${formatAssetAmount(request.fee.value)}`);
  return lines;
}

const deviceApprovedDelayMs = 600;

interface DeviceStepProps {
  run: JourneyRun;
  request: ApprovalRequest;
  dispatch(action: JourneyAction): void;
  children: ReactNode;
}

function DeviceStep({ run, request, dispatch, children }: DeviceStepProps) {
  const [phase, setPhase] = useState<LedgerSheetPhase>('connect');
  const requestId = run.request?.id ?? '';
  const scope = { runId: run.runId, requestId };

  useEffect(() => {
    if (phase !== 'approved') return;
    const timer = setTimeout(
      () => dispatch({ type: 'device-approve', runId: run.runId, requestId }),
      deviceApprovedDelayMs
    );
    return () => clearTimeout(timer);
  }, [dispatch, phase, requestId, run.runId]);

  return (
    <Box position="relative" height="100%">
      <Box height="100%" opacity={0.4} inert>
        {children}
      </Box>
      <Box position="absolute" left="0" right="0" bottom="0" maxHeight="100%" overflowY="auto">
        <ApprovalLedgerSheet
          phase={phase}
          chain={request.chain}
          deviceLines={deviceLinesFor(request)}
          onConnect={() => setPhase('review')}
          onApprove={() => setPhase('approved')}
          onReject={() => dispatch({ type: 'device-reject', ...scope })}
          onDisconnect={() => setPhase('disconnected')}
          onCancel={() => dispatch({ type: 'cancel', ...scope })}
        />
      </Box>
    </Box>
  );
}

interface ProgressViewProps {
  title: string;
  body: string;
}

function ProgressView({ title, body }: ProgressViewProps) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap="space.03"
      height="100%"
      p="space.06"
      textAlign="center"
      role="status"
    >
      <Spinner />
      <styled.span textStyle="heading.05" color="ink.text-primary">
        {title}
      </styled.span>
      <styled.span textStyle="body.02" color="ink.text-subdued">
        {body}
      </styled.span>
    </Flex>
  );
}

function ResultView({ result }: { result: JourneyResult }) {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap="space.02"
      height="100%"
      p="space.06"
      textAlign="center"
      role="status"
    >
      <styled.span
        textStyle="heading.05"
        color={result.tone === 'failure' ? 'red.action-primary-default' : 'ink.text-primary'}
      >
        {result.title}
      </styled.span>
      <styled.span textStyle="body.02" color="ink.text-subdued">
        {result.body}
      </styled.span>
    </Flex>
  );
}

interface JourneyWalletViewProps {
  run: JourneyRun;
  request: ApprovalRequest;
  direction: ApprovalDirection;
  confirmMode?: ConfirmMode;
  dispatch(action: JourneyAction): void;
}

export function JourneyWalletView({
  run,
  request,
  direction,
  confirmMode,
  dispatch,
}: JourneyWalletViewProps) {
  const activeRequest = run.request;
  if (!activeRequest) return null;
  const scope = { runId: run.runId, requestId: activeRequest.id };
  const review = (
    <ApprovalScreen
      request={request}
      direction={direction}
      reviewKey={`${activeRequest.id}:${activeRequest.revision}`}
      confirmMode={confirmMode}
      onApprove={() => dispatch({ type: 'approve', revision: activeRequest.revision, ...scope })}
      onCancel={() => dispatch({ type: 'cancel', ...scope })}
    />
  );

  switch (run.stage) {
    case 'review':
      return review;
    case 'device':
      return (
        <DeviceStep key={activeRequest.id} run={run} request={request} dispatch={dispatch}>
          {review}
        </DeviceStep>
      );
    case 'signing':
      return (
        <ProgressView
          title={request.signer.kind === 'ledger' ? 'Finishing signature' : 'Signing'}
          body="Leather is signing with your keys."
        />
      );
    case 'broadcasting':
      return (
        <ProgressView
          title="Broadcasting"
          body={`Sending the transaction to the ${request.chain === 'bitcoin' ? 'Bitcoin' : 'Stacks'} network.`}
        />
      );
    default: {
      const result = describeJourneyResult(run, request);
      return result ? <ResultView result={result} /> : null;
    }
  }
}
