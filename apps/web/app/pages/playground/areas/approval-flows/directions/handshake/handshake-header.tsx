import { useEffect, useState } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { LeatherLettermarkIcon } from '@leather.io/ui';

import { RequesterMark } from '../../pattern/approval-identity';
import { usePrefersReducedMotion } from '../../pattern/use-prefers-reduced-motion';
import type { ApprovalRequest } from '../../scenarios/approval-scenario.types';

const handshakeDurationMs = 520;

function useHandshakeEntered(animate: boolean) {
  const reducedMotion = usePrefersReducedMotion();
  const still = !animate || reducedMotion;
  const [entered, setEntered] = useState(still);

  useEffect(() => {
    if (still) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [still]);

  return { entered: still || entered, still };
}

interface HandshakeHeaderProps {
  request: ApprovalRequest;
  animate?: boolean;
}

export function HandshakeHeader({ request, animate = false }: HandshakeHeaderProps) {
  const { entered, still } = useHandshakeEntered(animate);
  const transition = still
    ? 'none'
    : `transform ${handshakeDurationMs}ms cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity ${handshakeDurationMs}ms ease-out`;

  return (
    <Flex direction="column" alignItems="center" gap="space.03" textAlign="center">
      <Flex alignItems="center" gap="space.02" data-handshake={entered ? 'met' : 'apart'}>
        <Box
          style={{
            transform: entered ? 'translateX(0)' : 'translateX(-28px)',
            opacity: entered ? 1 : 0,
            transition,
          }}
        >
          <RequesterMark requester={request.requester} size={44} />
        </Box>
        <Box
          width="32px"
          height="2px"
          bg="ink.border-default"
          transformOrigin="center"
          style={{
            transform: entered ? 'scaleX(1)' : 'scaleX(0)',
            transition: still ? 'none' : `transform ${handshakeDurationMs}ms ease-out 120ms`,
          }}
          aria-hidden
        />
        <Flex
          alignItems="center"
          justifyContent="center"
          width="44px"
          height="44px"
          borderRadius="round"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="ink.border-default"
          bg="ink.background-primary"
          style={{
            transform: entered ? 'translateX(0)' : 'translateX(28px)',
            opacity: entered ? 1 : 0,
            transition,
          }}
        >
          <LeatherLettermarkIcon color="ink.text-primary" />
        </Flex>
      </Flex>
      <Flex direction="column" gap="space.01">
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {request.requester.origin}
          {request.requester.verified ? null : ' · not verified'}
        </styled.span>
        <styled.h1 textStyle="heading.05" color="ink.text-primary">
          {request.title}
        </styled.h1>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {request.subtitle}
        </styled.p>
      </Flex>
    </Flex>
  );
}
