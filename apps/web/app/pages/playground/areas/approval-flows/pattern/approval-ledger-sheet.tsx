import { type ReactNode, Suspense, lazy } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import {
  Button,
  ConnectLedgerErr,
  ConnectLedgerSuccess,
  LedgerIlluDisconnected,
  LedgerTxRejected,
  SignLedgerTransaction,
} from '@leather.io/ui';

import type { ApprovalChain } from '../scenarios/approval-scenario.types';

const ApprovalLedgerAnimation = lazy(async () => ({
  default: (await import('./approval-ledger-animation')).ApprovalLedgerAnimation,
}));

export const ledgerSheetStates = [
  'connect',
  'review',
  'rejected',
  'disconnected',
  'error',
  'success',
] as const;

export type LedgerSheetState = (typeof ledgerSheetStates)[number];

const ledgerAppName = {
  bitcoin: 'Bitcoin',
  stacks: 'Stacks',
} as const;

function sheetCopy(state: LedgerSheetState, chain: ApprovalChain) {
  const appName = ledgerAppName[chain];
  switch (state) {
    case 'connect':
      return {
        title: 'Connect your Ledger',
        body: `Plug in your Ledger, unlock it and open the ${appName} app.`,
      };
    case 'review':
      return {
        title: 'Approve on your Ledger',
        body: 'Check the amount, recipient and fee on the device screen, then approve.',
      };
    case 'rejected':
      return {
        title: 'Rejected on your Ledger',
        body: 'Nothing was signed. You can review the request and try again.',
      };
    case 'disconnected':
      return {
        title: 'Ledger disconnected',
        body: 'Reconnect your Ledger to continue. Nothing was signed.',
      };
    case 'error':
      return {
        title: `Open the ${appName} app`,
        body: `Leather could not reach the ${appName} app. Unlock your Ledger and open it.`,
      };
    case 'success':
      return { title: 'Signed on your Ledger', body: 'Leather received the signature.' };
    default:
      return { title: 'Ledger', body: 'Follow the steps on your device.' };
  }
}

function LedgerIllustration({ state, preview }: { state: LedgerSheetState; preview: boolean }) {
  switch (state) {
    case 'connect':
      return (
        <Suspense fallback={<Box height="176px" />}>
          <ApprovalLedgerAnimation preview={preview} />
        </Suspense>
      );
    case 'review':
      return <SignLedgerTransaction />;
    case 'rejected':
      return <LedgerTxRejected />;
    case 'disconnected':
      return <LedgerIlluDisconnected />;
    case 'error':
      return <ConnectLedgerErr />;
    case 'success':
      return <ConnectLedgerSuccess />;
    default:
      return null;
  }
}

interface ApprovalLedgerSheetProps {
  state: LedgerSheetState;
  chain: ApprovalChain;
  preview?: boolean;
  onConnected?(): void;
  onApprove?(): void;
  onReject?(): void;
  onClose?(): void;
}

export function ApprovalLedgerSheet({
  state,
  chain,
  preview = false,
  onConnected,
  onApprove,
  onReject,
  onClose,
}: ApprovalLedgerSheetProps) {
  const copy = sheetCopy(state, chain);
  let actions: ReactNode = null;
  if (state === 'connect' && onConnected) {
    actions = (
      <Button type="button" variant="outline" fullWidth onClick={onConnected}>
        Ledger is connected
      </Button>
    );
  }
  if (state === 'review' && onApprove && onReject) {
    actions = (
      <Flex gap="space.02" width="100%">
        <Box flex={1} minWidth={0}>
          <Button type="button" variant="outline" fullWidth onClick={onReject}>
            Reject on device
          </Button>
        </Box>
        <Box flex={1} minWidth={0}>
          <Button type="button" fullWidth onClick={onApprove}>
            Approve on device
          </Button>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex
      role="dialog"
      aria-label={copy.title}
      data-ledger-state={state}
      direction="column"
      alignItems="center"
      gap="space.04"
      px="space.05"
      pt="space.05"
      pb="space.05"
      bg="ink.background-primary"
      borderTopRadius="lg"
      boxShadow="0 -8px 32px rgba(0,0,0,0.16)"
      textAlign="center"
    >
      <Flex
        justifyContent="center"
        width="100%"
        color="ink.text-primary"
        overflow="hidden"
        data-illustration={state}
      >
        <LedgerIllustration state={state} preview={preview} />
      </Flex>
      <Flex direction="column" gap="space.02">
        <styled.h2 textStyle="heading.05" color="ink.text-primary">
          {copy.title}
        </styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {copy.body}
        </styled.p>
      </Flex>
      {preview ? null : actions}
      {onClose && !preview ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      ) : null}
      <styled.span textStyle="caption.02" color="ink.text-subdued">
        Simulated device · no Ledger is connected
      </styled.span>
    </Flex>
  );
}
