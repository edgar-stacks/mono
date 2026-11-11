import { Box, Flex, styled } from 'leather-styles/jsx';

import { Button, LockIcon } from '@leather.io/ui';

import { RequesterMark } from '../pattern/approval-identity';
import { leatherLettermarkPath } from '../pattern/approval-launch-animations';
import { formatAssetAmount } from '../scenarios/approval-assets';
import type { ApprovalRequest } from '../scenarios/approval-model';
import type { JourneyDefinition } from './journey-definitions';
import type { JourneyResult } from './journey-wallet-views';

function requestSummary(request: ApprovalRequest) {
  if (request.kind === 'connect') return 'Connect your Leather wallet to continue.';
  if (request.message) return 'Sign a message to prove you own this account.';
  if (request.movements.length === 0) return request.title;
  return request.movements
    .map(
      movement =>
        `${movement.direction === 'out' ? 'Pay' : 'Get'} ${formatAssetAmount(movement.value)}`
    )
    .join(' · ');
}

interface BrowserChromeProps {
  origin: string;
  onOpenWallet(): void;
  walletBusy: boolean;
}

function BrowserChrome({ origin, onOpenWallet, walletBusy }: BrowserChromeProps) {
  return (
    <Flex
      alignItems="center"
      gap="space.03"
      px="space.03"
      py="space.02"
      bg="ink.background-secondary"
      borderBottomWidth="1px"
      borderBottomStyle="solid"
      borderColor="ink.border-transparent"
    >
      <Flex gap="space.01" aria-hidden display={{ base: 'none', md: 'flex' }}>
        <Box width="10px" height="10px" borderRadius="round" bg="ink.border-default" />
        <Box width="10px" height="10px" borderRadius="round" bg="ink.border-default" />
        <Box width="10px" height="10px" borderRadius="round" bg="ink.border-default" />
      </Flex>
      <Flex
        flex="1"
        alignItems="center"
        gap="space.02"
        minWidth="0"
        px="space.03"
        py="space.01"
        borderRadius="round"
        bg="ink.background-primary"
      >
        <LockIcon variant="small" />
        <styled.span textStyle="caption.01" color="ink.text-primary" truncate>
          {origin}
        </styled.span>
      </Flex>
      <styled.button
        type="button"
        onClick={onOpenWallet}
        disabled={walletBusy}
        aria-label="Open Leather"
        display="flex"
        alignItems="center"
        justifyContent="center"
        width="32px"
        height="32px"
        borderRadius="sm"
        color="ink.text-primary"
        cursor={walletBusy ? 'default' : 'pointer'}
        _hover={{ bg: 'ink.component-background-hover' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 25" fill="currentColor" aria-hidden>
          <path d={leatherLettermarkPath} />
        </svg>
      </styled.button>
    </Flex>
  );
}

const resultColors = {
  progress: 'yellow.background-secondary',
  success: 'green.background-secondary',
  neutral: 'ink.background-secondary',
  failure: 'red.background-secondary',
} as const;

interface JourneyAppProps {
  journey: JourneyDefinition;
  request: ApprovalRequest;
  result: JourneyResult | null;
  canStart: boolean;
  hasTransactions: boolean;
  walletBusy: boolean;
  onStart(): void;
  onOpenActivity(): void;
}

export function JourneyApp({
  journey,
  request,
  result,
  canStart,
  hasTransactions,
  walletBusy,
  onStart,
  onOpenActivity,
}: JourneyAppProps) {
  return (
    <Flex direction="column" height="100%" bg="ink.background-primary">
      <BrowserChrome
        origin={request.requester.origin}
        onOpenWallet={onOpenActivity}
        walletBusy={walletBusy}
      />
      <Flex
        direction="column"
        alignItems="center"
        gap="space.05"
        flex="1"
        overflowY="auto"
        px="space.04"
        py="space.07"
        inert={walletBusy}
      >
        <Flex alignItems="center" gap="space.03">
          <RequesterMark requester={request.requester} size={48} />
          <Flex direction="column">
            <styled.span textStyle="heading.05" color="ink.text-primary">
              {request.requester.name}
            </styled.span>
            <styled.span textStyle="caption.01" color="ink.text-subdued">
              {journey.title}
            </styled.span>
          </Flex>
        </Flex>
        <Flex
          direction="column"
          gap="space.04"
          width="100%"
          maxWidth="420px"
          p="space.05"
          borderRadius="lg"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="ink.border-default"
        >
          <styled.span textStyle="label.01" color="ink.text-primary">
            {request.title}
          </styled.span>
          <styled.span textStyle="body.02" color="ink.text-subdued">
            {requestSummary(request)}
          </styled.span>
          <Button size="lg" fullWidth disabled={!canStart} onClick={onStart}>
            {result && canStart ? 'Start again' : journey.appAction}
          </Button>
        </Flex>
        {result ? (
          <Flex
            direction="column"
            gap="space.02"
            width="100%"
            maxWidth="420px"
            p="space.04"
            borderRadius="md"
            bg={resultColors[result.tone]}
            role="status"
          >
            <styled.span textStyle="label.02" color="ink.text-primary">
              {result.title}
            </styled.span>
            <styled.span textStyle="body.02" color="ink.text-primary">
              {result.body}
            </styled.span>
            {hasTransactions ? (
              <Box>
                <Button variant="outline" size="sm" onClick={onOpenActivity}>
                  Open Leather Activity
                </Button>
              </Box>
            ) : null}
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  );
}
