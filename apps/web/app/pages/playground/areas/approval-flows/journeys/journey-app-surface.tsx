import type { RefObject } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { RequesterAvatar } from '../pattern/approval-identity';
import type { JourneyDefinition, JourneyRequest } from './journey-definitions';
import { type JourneyRun, isRequestOpen } from './journey-state';
import { formatSignedAssetAmount } from './journey-world';

function getAppResponse(request: JourneyRequest, run: JourneyRun) {
  switch (run.stage) {
    case 'connected':
      return 'Wallet connected. The app can now see your addresses.';
    case 'signed':
      if (request.kind === 'sign-message') return 'Signature received.';
      if (request.vaultStep === 'propose') return 'Proposal created. Waiting for co-signers.';
      if (request.vaultStep === 'co-sign') return 'Signature added. Ready to broadcast.';
      return 'Signed transaction received. Nothing broadcast yet.';
    case 'broadcasting':
      return 'Approved in the wallet. Waiting for the network to accept the transaction.';
    case 'pending':
      return 'Transaction submitted. Waiting for confirmation.';
    case 'confirmed':
      return 'Transaction confirmed.';
    case 'failed':
      return run.failure === 'submitted'
        ? 'Transaction failed on the network.'
        : 'The wallet couldn’t broadcast the transaction.';
    case 'cancelled':
      return 'Request declined in the wallet.';
    default:
      return null;
  }
}

interface JourneyAppSurfaceProps {
  definition: JourneyDefinition;
  request: JourneyRequest;
  run: JourneyRun;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onStart(): void;
  onShowActivity(): void;
}

export function JourneyAppSurface({
  definition,
  request,
  run,
  triggerRef,
  onStart,
  onShowActivity,
}: JourneyAppSurfaceProps) {
  const response = getAppResponse(request, run);
  const isOpen = isRequestOpen(run);
  const hasStarted = run.requestId !== null;
  const showsActivity =
    run.stage === 'pending' || run.stage === 'confirmed' || run.stage === 'failed';

  return (
    <Flex direction="column" flex={1} bg="ink.background-secondary" data-app-surface>
      <Flex
        alignItems="center"
        gap="space.03"
        px={{ base: 'space.04', md: 'space.06' }}
        py="space.03"
        bg="ink.background-primary"
        borderBottomWidth="1px"
        borderStyle="solid"
        borderColor="ink.border-default"
      >
        <RequesterAvatar requester={definition.requester} size={28} />
        <styled.span textStyle="label.02" color="ink.text-primary">
          {definition.requester.name}
        </styled.span>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {definition.requester.origin}
        </styled.span>
      </Flex>
      <Flex flex={1} alignItems="center" justifyContent="center" p="space.05">
        <Flex
          direction="column"
          gap="space.04"
          p="space.05"
          width="100%"
          maxWidth="420px"
          borderRadius="md"
          bg="ink.background-primary"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="ink.border-default"
        >
          <Flex direction="column" gap="space.01">
            <styled.h2 textStyle="heading.05" color="ink.text-primary">
              {request.title}
            </styled.h2>
            <styled.p textStyle="body.02" color="ink.text-subdued">
              {definition.summary}
            </styled.p>
          </Flex>
          {request.movements.length > 0 ? (
            <Flex direction="column" gap="space.01">
              {request.movements.map(movement => (
                <styled.span key={movement.asset} textStyle="label.02" color="ink.text-primary">
                  {formatSignedAssetAmount(movement)}
                </styled.span>
              ))}
            </Flex>
          ) : null}
          {response ? (
            <Box
              p="space.03"
              borderRadius="sm"
              bg="ink.component-background-default"
              aria-live="polite"
              data-app-response={run.stage}
            >
              <styled.span textStyle="body.02" color="ink.text-primary">
                {response}
              </styled.span>
            </Box>
          ) : null}
          <Flex gap="space.02" flexWrap="wrap">
            <Button ref={triggerRef} onClick={onStart} disabled={isOpen} flex={1}>
              {hasStarted && !isOpen ? 'Start again' : request.appAction}
            </Button>
            {showsActivity ? (
              <Button variant="outline" onClick={onShowActivity} flex={1}>
                View in Activity
              </Button>
            ) : null}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
