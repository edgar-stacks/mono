import { useEffect, useState } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { CheckmarkIcon } from '@leather.io/ui';

import type { ApprovalRequester } from '../scenarios/approval-model';
import { RequesterMark } from './approval-identity';
import { useReducedMotion } from './use-reduced-motion';

export const leatherLettermarkPath =
  'M15.462 9.378c2.134-.34 5.221-2.656 5.221-4.46 0-.545-.427-.919-1.05-.919-1.183 0-3.186 1.838-4.171 5.379ZM5.578 18.33c-2.792 0-3.021 2.86-.23 2.86 1.248 0 2.758-.511 3.546-1.43-1.149-1.022-2.101-1.43-3.316-1.43Zm17.765-1.226c.164 4.8-2.2 7.49-6.206 7.49-2.365 0-3.547-.92-6.075-2.622-1.314 1.498-3.81 2.622-5.878 2.622-7.126 0-6.83-9.362.427-9.362 1.51 0 2.79.409 4.433 1.464l1.083-3.915c-4.466-1.26-6.699-4.8-4.498-9.872h3.546c-1.97 3.37-.624 6.161 1.872 6.468C13.393 4.442 16.283.595 20.125.595 22.292.595 24 2.059 24 4.714c0 4.255-5.386 7.727-9.457 8.068l-1.675 6.094c1.904 2.28 7.191 4.493 7.191-1.77h3.284Z';

type AnimationPhase = 'start' | 'middle' | 'end';

const middleDelayMs = 80;
const endDelayMs = 700;

function useAnimationPhase(animate: boolean, replayKey: string): AnimationPhase {
  const [phase, setPhase] = useState<AnimationPhase>(animate ? 'start' : 'end');

  useEffect(() => {
    if (!animate) {
      setPhase('end');
      return;
    }
    setPhase('start');
    const middle = setTimeout(() => setPhase('middle'), middleDelayMs);
    const end = setTimeout(() => setPhase('end'), endDelayMs);
    return () => {
      clearTimeout(middle);
      clearTimeout(end);
    };
  }, [animate, replayKey]);

  return phase;
}

interface LeatherLaunchAnimationProps {
  interactive?: boolean;
  replayKey?: string;
  size?: number;
}

export function LeatherLaunchAnimation({
  interactive = true,
  replayKey = '',
  size = 56,
}: LeatherLaunchAnimationProps) {
  const reducedMotion = useReducedMotion();
  const phase = useAnimationPhase(interactive && !reducedMotion, replayKey);
  const drawn = phase !== 'start';
  return (
    <Box color="ink.text-primary" data-phase={phase} aria-hidden>
      <svg width={size} height={size} viewBox="-1 -1 26 27" fill="none">
        <path
          d={leatherLettermarkPath}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={0.6}
          strokeDasharray="1"
          style={{
            strokeDashoffset: drawn ? 0 : 1,
            fill: phase === 'end' ? 'currentColor' : 'transparent',
            transition: 'stroke-dashoffset 0.6s ease-out, fill 0.3s ease-in',
          }}
        />
      </svg>
    </Box>
  );
}

interface HandshakeAnimationProps {
  requester: ApprovalRequester;
  interactive?: boolean;
  replayKey?: string;
}

export function HandshakeAnimation({
  requester,
  interactive = true,
  replayKey = '',
}: HandshakeAnimationProps) {
  const reducedMotion = useReducedMotion();
  const phase = useAnimationPhase(interactive && !reducedMotion, replayKey);
  const offset = phase === 'start' ? 24 : 0;
  const connected = phase === 'end';
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      gap="space.02"
      data-phase={phase}
      aria-label={`${requester.name} and Leather`}
      role="img"
    >
      <Box style={{ transform: `translateX(-${offset}px)`, transition: 'transform 0.5s ease-out' }}>
        <RequesterMark requester={requester} size={44} />
      </Box>
      <Flex alignItems="center" position="relative" width="48px" justifyContent="center">
        <Box
          height="2px"
          bg="ink.border-default"
          style={{ width: connected ? '100%' : '0%', transition: 'width 0.3s ease-out' }}
        />
        <Flex
          position="absolute"
          alignItems="center"
          justifyContent="center"
          width="20px"
          height="20px"
          borderRadius="round"
          bg="green.action-primary-default"
          color="ink.background-primary"
          style={{ opacity: connected ? 1 : 0, transition: 'opacity 0.2s ease-in' }}
        >
          <CheckmarkIcon variant="small" />
        </Flex>
      </Flex>
      <Flex
        alignItems="center"
        justifyContent="center"
        width="44px"
        height="44px"
        borderRadius="sm"
        bg="ink.text-primary"
        color="ink.background-primary"
        style={{ transform: `translateX(${offset}px)`, transition: 'transform 0.5s ease-out' }}
      >
        <styled.svg width="22px" height="22px" viewBox="0 0 24 25" fill="currentColor">
          <path d={leatherLettermarkPath} />
        </styled.svg>
      </Flex>
    </Flex>
  );
}
