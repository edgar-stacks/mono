import { useEffect, useState } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { LeatherLettermarkIcon } from '@leather.io/ui';

import type { JourneyRequester } from '../../journeys/journey-definitions';
import { RequesterAvatar, RequesterLine } from '../../pattern/approval-identity';
import { useReducedMotion } from '../../pattern/use-reduced-motion';

interface HandshakeMarkProps {
  requester: JourneyRequester;
  animate?: boolean;
}

export function HandshakeMark({ requester, animate = false }: HandshakeMarkProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;
  const [isJoined, setIsJoined] = useState(!shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate) {
      setIsJoined(true);
      return;
    }
    setIsJoined(false);
    const frame = requestAnimationFrame(() => setIsJoined(true));
    return () => cancelAnimationFrame(frame);
  }, [shouldAnimate]);

  const transition = shouldAnimate ? 'transform 520ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';

  return (
    <Flex alignItems="center" justifyContent="center" gap="space.00" aria-hidden>
      <Box style={{ transform: isJoined ? 'none' : 'translateX(-16px)', transition }}>
        <RequesterAvatar requester={requester} />
      </Box>
      <Box
        width="40px"
        height="2px"
        bg="ink.text-primary"
        style={{
          transform: isJoined ? 'scaleX(1)' : 'scaleX(0)',
          transition,
        }}
      />
      <Flex
        alignItems="center"
        justifyContent="center"
        width="40px"
        height="40px"
        borderRadius="round"
        bg="ink.component-background-default"
        color="ink.text-primary"
        style={{ transform: isJoined ? 'none' : 'translateX(16px)', transition }}
      >
        <LeatherLettermarkIcon />
      </Flex>
    </Flex>
  );
}

interface HandshakeHeaderProps {
  requester: JourneyRequester;
  title: string;
  animate?: boolean;
}

export function HandshakeHeader({ requester, title, animate }: HandshakeHeaderProps) {
  return (
    <Flex direction="column" alignItems="center" gap="space.03" textAlign="center">
      <HandshakeMark requester={requester} animate={animate} />
      <Flex direction="column" gap="space.01">
        <styled.h2 textStyle="heading.05" color="ink.text-primary">
          {title}
        </styled.h2>
        <RequesterLine requester={requester} />
      </Flex>
    </Flex>
  );
}
