import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { Box, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import { useReducedMotion } from './use-reduced-motion';

export const minimumReviewMs = 1_200;
export const holdToApproveMs = 1_000;

interface ApprovalConfirmProps {
  label: string;
  requestKey: string;
  onConfirm(): void;
  hold?: boolean;
  minReviewMs?: number;
  holdMs?: number;
  disabled?: boolean;
}

export function ApprovalConfirm({
  label,
  requestKey,
  onConfirm,
  hold = false,
  minReviewMs = minimumReviewMs,
  holdMs = holdToApproveMs,
  disabled = false,
}: ApprovalConfirmProps) {
  const [isReady, setIsReady] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const hasFired = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    hasFired.current = false;
    setIsReady(false);
    setIsHolding(false);
    const timer = setTimeout(() => setIsReady(true), minReviewMs);
    return () => clearTimeout(timer);
  }, [requestKey, minReviewMs]);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    []
  );

  const isBlocked = disabled || !isReady;

  function fire() {
    if (isBlocked || hasFired.current) return;
    hasFired.current = true;
    onConfirm();
  }

  function startHold() {
    if (isBlocked || hasFired.current || holdTimer.current) return;
    setIsHolding(true);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      setIsHolding(false);
      fire();
    }, holdMs);
  }

  function stopHold() {
    if (!holdTimer.current) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setIsHolding(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) startHold();
  }

  function onKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === ' ' || event.key === 'Enter') stopHold();
  }

  const holdProps = hold
    ? {
        onPointerDown: startHold,
        onPointerUp: stopHold,
        onPointerLeave: stopHold,
        onPointerCancel: stopHold,
        onKeyDown,
        onKeyUp,
      }
    : { onClick: fire };

  return (
    <Box position="relative" flex={1}>
      <Button
        width="100%"
        aria-disabled={isBlocked}
        data-ready={isReady}
        opacity={isBlocked ? 0.6 : 1}
        {...holdProps}
      >
        {hold && !isBlocked ? `Hold to ${label.toLowerCase()}` : label}
      </Button>
      {hold ? (
        <styled.span
          aria-hidden
          position="absolute"
          left={0}
          bottom={0}
          height="3px"
          bg="ink.background-primary"
          opacity={0.5}
          pointerEvents="none"
          style={{
            width: isHolding ? '100%' : '0%',
            transition:
              isHolding && !reducedMotion ? `width ${holdMs}ms linear` : 'width 120ms ease-out',
          }}
        />
      ) : null}
    </Box>
  );
}
