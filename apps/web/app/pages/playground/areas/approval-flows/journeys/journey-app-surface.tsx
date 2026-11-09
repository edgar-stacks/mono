import { Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { RequesterMark } from '../pattern/approval-identity';
import type { ApprovalApp, ApprovalRequest } from '../scenarios/approval-scenario.types';
import type { JourneyRun } from './journey-state';

interface AppStatus {
  message: string;
  showActivity: boolean;
}

function appStatus(run: JourneyRun, request: ApprovalRequest): AppStatus | null {
  switch (run.phase) {
    case 'review':
    case 'device':
      return { message: 'Waiting for you to respond in Leather…', showActivity: false };
    case 'rejected':
      return { message: 'You cancelled the request in Leather.', showActivity: false };
    case 'connected':
      return { message: `Connected as ${request.account.label}.`, showActivity: false };
    case 'signed':
      return {
        message: 'Signature received. Nothing was broadcast by Leather.',
        showActivity: false,
      };
    case 'pending':
      return { message: 'Submitted. Waiting for confirmation…', showActivity: true };
    case 'confirmed':
      return { message: 'Confirmed.', showActivity: true };
    case 'failed':
      return run.failure === 'pre-broadcast'
        ? { message: 'Leather could not broadcast the transaction.', showActivity: false }
        : { message: 'The transaction failed on-chain.', showActivity: true };
    default:
      return null;
  }
}

interface JourneyAppSurfaceProps {
  app: ApprovalApp;
  run: JourneyRun;
  request: ApprovalRequest;
  walletOpen: boolean;
  onRequest(): void;
  onShowWallet(): void;
  onViewActivity(): void;
}

export function JourneyAppSurface({
  app,
  run,
  request,
  walletOpen,
  onRequest,
  onShowWallet,
  onViewActivity,
}: JourneyAppSurfaceProps) {
  const status = appStatus(run, request);
  const canRequest = run.phase === 'app' || run.phase === 'rejected';
  const waitingOnWallet = !walletOpen && (run.phase === 'review' || run.phase === 'device');

  return (
    <styled.section
      aria-label={app.name}
      display="flex"
      flexDirection="column"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      bg="ink.background-primary"
      overflow="hidden"
      minHeight="420px"
    >
      <Flex
        alignItems="center"
        gap="space.03"
        px="space.04"
        py="space.03"
        bg="ink.background-secondary"
        borderBottomWidth="1px"
        borderBottomStyle="solid"
        borderColor="ink.border-default"
      >
        <RequesterMark requester={request.requester} size={24} />
        <styled.span textStyle="label.03" color="ink.text-primary">
          {app.name}
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued" truncate>
          https://{app.origin}
        </styled.span>
      </Flex>
      <Flex direction="column" flex={1} gap="space.05" p={{ base: 'space.05', md: 'space.08' }}>
        <Flex direction="column" gap="space.02" maxWidth="480px">
          <styled.h2 textStyle="heading.04" color="ink.text-primary">
            {app.headline}
          </styled.h2>
          <styled.p textStyle="body.01" color="ink.text-subdued">
            {app.description}
          </styled.p>
        </Flex>
        <Flex gap="space.02" flexWrap="wrap">
          <Button type="button" disabled={!canRequest} onClick={onRequest}>
            {run.phase === 'rejected' ? 'Try again' : app.actionLabel}
          </Button>
          {waitingOnWallet ? (
            <Button type="button" variant="outline" onClick={onShowWallet}>
              Open Leather
            </Button>
          ) : null}
        </Flex>
        {status ? (
          <Flex
            role="status"
            direction={{ base: 'column', md: 'row' }}
            alignItems={{ base: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            gap="space.03"
            p="space.04"
            borderRadius="sm"
            bg="ink.background-secondary"
            maxWidth="560px"
          >
            <styled.span textStyle="body.02" color="ink.text-primary">
              {status.message}
            </styled.span>
            {status.showActivity ? (
              <Button type="button" variant="outline" size="sm" onClick={onViewActivity}>
                View in Activity
              </Button>
            ) : null}
          </Flex>
        ) : null}
      </Flex>
    </styled.section>
  );
}
