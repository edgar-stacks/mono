import type { ComponentType, ReactNode } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

import {
  Button,
  ConnectLedgerErr,
  ConnectLedgerSuccess,
  LedgerIlluDisconnected,
  LedgerTxRejected,
  SignLedgerTransaction,
} from '@leather.io/ui';

import type { ApprovalChain } from '../scenarios/approval-model';
import { ApprovalLedgerAnimation } from './approval-ledger-animation';
import { ApprovalLedgerDevice } from './approval-ledger-device';

export const ledgerSheetPhases = [
  'connect',
  'open-app',
  'review',
  'approved',
  'rejected',
  'disconnected',
] as const;

export type LedgerSheetPhase = (typeof ledgerSheetPhases)[number];

const appNames: Record<ApprovalChain, string> = { bitcoin: 'Bitcoin', stacks: 'Stacks' };

interface PhaseCopy {
  title: string;
  body: string;
}

function phaseCopy(phase: LedgerSheetPhase, chain: ApprovalChain): PhaseCopy {
  const app = appNames[chain];
  const copies: Record<LedgerSheetPhase, PhaseCopy> = {
    connect: {
      title: 'Connect your Ledger',
      body: `Plug in your Ledger, unlock it and open the ${app} app.`,
    },
    'open-app': {
      title: `Open the ${app} app`,
      body: `Your Ledger is connected, but the ${app} app is not open.`,
    },
    review: {
      title: 'Approve on your Ledger',
      body: 'Check that the device shows the same details, then approve on the device.',
    },
    approved: { title: 'Approved on your Ledger', body: 'Leather is finishing the signature.' },
    rejected: {
      title: 'Rejected on your Ledger',
      body: 'Nothing was signed. Return to the request or cancel it.',
    },
    disconnected: {
      title: 'Ledger disconnected',
      body: 'Reconnect and unlock your Ledger to continue. Nothing was signed.',
    },
  };
  return copies[phase];
}

const phaseIllustrations: Record<Exclude<LedgerSheetPhase, 'connect' | 'review'>, ComponentType> = {
  'open-app': ConnectLedgerErr,
  approved: ConnectLedgerSuccess,
  rejected: LedgerTxRejected,
  disconnected: LedgerIlluDisconnected,
};

function PhaseIllustration({
  phase,
  deviceLines,
}: {
  phase: LedgerSheetPhase;
  deviceLines: string[];
}) {
  if (phase === 'connect') return <ApprovalLedgerAnimation />;
  if (phase === 'review') {
    return (
      <Flex direction="column" alignItems="center" gap="space.04">
        <SignLedgerTransaction />
        <ApprovalLedgerDevice lines={deviceLines} />
      </Flex>
    );
  }
  const Illustration = phaseIllustrations[phase];
  return <Illustration />;
}

interface ApprovalLedgerSheetProps {
  phase: LedgerSheetPhase;
  chain: ApprovalChain;
  deviceLines: string[];
  onConnect(): void;
  onApprove(): void;
  onReject(): void;
  onDisconnect(): void;
  onCancel(): void;
}

export function ApprovalLedgerSheet({
  phase,
  chain,
  deviceLines,
  onConnect,
  onApprove,
  onReject,
  onDisconnect,
  onCancel,
}: ApprovalLedgerSheetProps) {
  const copy = phaseCopy(phase, chain);
  return (
    <Flex
      role="dialog"
      aria-label={copy.title}
      data-phase={phase}
      direction="column"
      gap="space.04"
      p="space.05"
      borderTopRadius="lg"
      bg="ink.background-primary"
      boxShadow="0 -8px 24px rgba(0, 0, 0, 0.12)"
    >
      <Flex justifyContent="center" color="ink.text-primary" minHeight="104px" alignItems="center">
        <PhaseIllustration phase={phase} deviceLines={deviceLines} />
      </Flex>
      <Flex direction="column" gap="space.02" textAlign="center">
        <styled.h2 textStyle="heading.05" color="ink.text-primary">
          {copy.title}
        </styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {copy.body}
        </styled.p>
      </Flex>
      <SheetActions
        phase={phase}
        onConnect={onConnect}
        onApprove={onApprove}
        onReject={onReject}
        onDisconnect={onDisconnect}
        onCancel={onCancel}
      />
    </Flex>
  );
}

type SheetActionsProps = Omit<ApprovalLedgerSheetProps, 'chain' | 'deviceLines'>;

function SimulationLabel({ children }: { children: ReactNode }) {
  return (
    <styled.span textStyle="caption.02" color="ink.text-subdued" textAlign="center">
      {children}
    </styled.span>
  );
}

function SheetActions({
  phase,
  onConnect,
  onApprove,
  onReject,
  onDisconnect,
  onCancel,
}: SheetActionsProps) {
  const cancel = (
    <Button variant="ghost" size="md" onClick={onCancel}>
      Cancel
    </Button>
  );
  if (phase === 'approved') return null;
  if (phase === 'review') {
    return (
      <Flex direction="column" gap="space.02">
        <SimulationLabel>Simulated device</SimulationLabel>
        <Flex gap="space.02">
          <Button variant="outline" size="md" flex="1" onClick={onReject}>
            Reject on device
          </Button>
          <Button size="md" flex="1" onClick={onApprove}>
            Approve on device
          </Button>
        </Flex>
        <Button variant="ghost" size="md" onClick={onDisconnect}>
          Unplug device
        </Button>
      </Flex>
    );
  }
  if (phase === 'rejected') {
    return (
      <Flex direction="column" gap="space.02">
        <Button size="md" onClick={onConnect}>
          Try again
        </Button>
        {cancel}
      </Flex>
    );
  }
  return (
    <Flex direction="column" gap="space.02">
      <SimulationLabel>Simulated device</SimulationLabel>
      <Button size="md" onClick={onConnect}>
        {phase === 'connect' ? 'Device ready' : 'Retry'}
      </Button>
      {cancel}
    </Flex>
  );
}
