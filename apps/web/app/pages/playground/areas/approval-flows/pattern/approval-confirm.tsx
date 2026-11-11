import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { Box, styled } from 'leather-styles/jsx';

const defaultMinReviewMs = 1200;
const defaultHoldMs = 1500;

interface ApprovalConfirmProps {
  label: string;
  reviewKey: string;
  onConfirm(): void;
  mode?: 'press' | 'hold';
  minReviewMs?: number;
  holdMs?: number;
}

export function ApprovalConfirm({
  label,
  reviewKey,
  onConfirm,
  mode = 'press',
  minReviewMs = defaultMinReviewMs,
  holdMs = defaultHoldMs,
}: ApprovalConfirmProps) {
  const reviewStartedAt = useRef(Date.now());
  const fired = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    reviewStartedAt.current = Date.now();
    fired.current = false;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setReady(false);
    setHolding(false);
    const timer = setTimeout(() => setReady(true), minReviewMs);
    return () => clearTimeout(timer);
  }, [reviewKey, minReviewMs]);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    []
  );

  function hasReviewed() {
    return Date.now() - reviewStartedAt.current >= minReviewMs;
  }

  function fire() {
    if (fired.current || !hasReviewed()) return;
    fired.current = true;
    onConfirm();
  }

  function clearHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function startHold() {
    if (fired.current || holdTimer.current || !hasReviewed()) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      fire();
    }, holdMs);
  }

  function cancelHold() {
    clearHold();
    setHolding(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) startHold();
  }

  function onKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === ' ' || event.key === 'Enter') cancelHold();
  }

  const holdHandlers =
    mode === 'hold'
      ? {
          onPointerDown: startHold,
          onPointerUp: cancelHold,
          onPointerLeave: cancelHold,
          onPointerCancel: cancelHold,
          onKeyDown,
          onKeyUp,
        }
      : { onClick: fire };

  return (
    <styled.button
      type="button"
      position="relative"
      overflow="hidden"
      flex="1"
      height="48px"
      px="space.04"
      borderRadius="round"
      bg="ink.action-primary-default"
      color="ink.background-primary"
      textStyle="label.02"
      cursor={ready ? 'pointer' : 'default'}
      opacity={ready ? 1 : 0.6}
      transition="opacity 0.2s"
      aria-disabled={!ready}
      data-ready={ready}
      data-mode={mode}
      {...holdHandlers}
    >
      {mode === 'hold' ? (
        <Box
          position="absolute"
          top="0"
          bottom="0"
          left="0"
          bg="ink.action-primary-hover"
          aria-hidden
          style={{
            width: holding ? '100%' : '0%',
            transition: holding ? `width ${holdMs}ms linear` : 'width 0.15s ease-out',
          }}
        />
      ) : null}
      <styled.span position="relative">
        {mode === 'hold' ? `Hold to ${label.toLowerCase()}` : label}
      </styled.span>
    </styled.button>
  );
}
