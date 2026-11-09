import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import {
  Button,
  ConnectLedgerErr,
  ConnectLedgerSuccess,
  LedgerIlluDisconnected,
  LedgerTxRejected,
  SignLedgerTransaction,
} from '@leather.io/ui';

import type { JourneyChain } from '../journeys/journey-definitions';
import { ApprovalLedgerAnimation } from './approval-ledger-animation';

export const ledgerDeviceStates = [
  'connect',
  'sign',
  'success',
  'rejected',
  'disconnected',
  'error',
] as const;

export type LedgerDeviceState = (typeof ledgerDeviceStates)[number];

interface LedgerSheetCopy {
  title: string;
  caption: string;
}

function getLedgerSheetCopy(state: LedgerDeviceState, chain: JourneyChain): LedgerSheetCopy {
  const app = chain === 'bitcoin' ? 'Bitcoin' : 'Stacks';
  const copy: Record<LedgerDeviceState, LedgerSheetCopy> = {
    connect: {
      title: 'Connect your Ledger',
      caption: `Plug in your Ledger, unlock it and open the ${app} app.`,
    },
    sign: {
      title: 'Approve on your Ledger',
      caption: `Check the details on the device screen match this request, then approve in the ${app} app.`,
    },
    success: {
      title: 'Ledger approved',
      caption: 'The device signed the request.',
    },
    rejected: {
      title: 'Rejected on your Ledger',
      caption: 'Nothing was signed. Review the request again, or cancel it.',
    },
    disconnected: {
      title: 'Ledger disconnected',
      caption: `Reconnect the device and open the ${app} app to continue.`,
    },
    error: {
      title: 'Ledger not found',
      caption: `Make sure the device is unlocked and the ${app} app is open.`,
    },
  };
  return copy[state];
}

interface LedgerIllustrationProps {
  state: LedgerDeviceState;
  interactive: boolean;
}

function LedgerIllustration({ state, interactive }: LedgerIllustrationProps) {
  const illustrations: Record<LedgerDeviceState, ReactNode> = {
    connect: <ApprovalLedgerAnimation interactive={interactive} />,
    sign: <SignLedgerTransaction />,
    success: <ConnectLedgerSuccess />,
    rejected: <LedgerTxRejected />,
    disconnected: <LedgerIlluDisconnected />,
    error: <ConnectLedgerErr />,
  };
  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      minHeight="120px"
      color="ink.text-primary"
      data-illustration={state}
    >
      {illustrations[state]}
    </Flex>
  );
}

interface ApprovalLedgerSheetProps {
  state: LedgerDeviceState;
  chain: JourneyChain;
  interactive?: boolean;
  onDeviceApprove?(): void;
  onDeviceReject?(): void;
  onRetry?(): void;
  onCancel?(): void;
}

export function ApprovalLedgerSheet({
  state,
  chain,
  interactive = true,
  onDeviceApprove,
  onDeviceReject,
  onRetry,
  onCancel,
}: ApprovalLedgerSheetProps) {
  const copy = getLedgerSheetCopy(state, chain);
  const canSimulateDevice = interactive && state === 'sign';
  const canRetry = interactive && (state === 'disconnected' || state === 'error');

  return (
    <Flex
      role="dialog"
      aria-label="Ledger device"
      direction="column"
      gap="space.04"
      p="space.05"
      borderTopRadius="lg"
      bg="ink.background-primary"
      borderTopWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      boxShadow="0 -12px 32px rgba(0,0,0,0.12)"
    >
      <Box mx="auto" width="40px" height="4px" borderRadius="round" bg="ink.border-default" />
      <LedgerIllustration state={state} interactive={interactive} />
      <Flex direction="column" gap="space.02" textAlign="center">
        <styled.h3 textStyle="heading.05" color="ink.text-primary">
          {copy.title}
        </styled.h3>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {copy.caption}
        </styled.p>
      </Flex>
      {canSimulateDevice ? (
        <Flex direction="column" gap="space.02">
          <styled.span textStyle="caption.01" color="ink.text-subdued" textAlign="center">
            Prototype only — stands in for the device buttons
          </styled.span>
          <Flex gap="space.02">
            <Button variant="outline" flex={1} onClick={onDeviceReject}>
              Reject on device
            </Button>
            <Button flex={1} onClick={onDeviceApprove}>
              Approve on device
            </Button>
          </Flex>
        </Flex>
      ) : null}
      {canRetry ? <Button onClick={onRetry}>Try again</Button> : null}
      {interactive && onCancel ? (
        <Button variant="ghost" onClick={onCancel}>
          Cancel request
        </Button>
      ) : null}
    </Flex>
  );
}
