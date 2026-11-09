import { type KeyboardEvent, type RefObject, useEffect, useRef, useState } from 'react';

import { Box, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

const minimumReviewMs = 1200;
const fullHoldMs = 1000;

type HoldTimer = RefObject<ReturnType<typeof setTimeout> | null>;

function clearHoldTimer(timer: HoldTimer) {
  if (timer.current) clearTimeout(timer.current);
  timer.current = null;
}

interface ApprovalConfirmProps {
  label: string;
  requestKey: string;
  mode?: 'tap' | 'hold';
  reviewMs?: number;
  holdMs?: number;
  disabled?: boolean;
  onConfirm(): void;
}

export function ApprovalConfirm({
  label,
  requestKey,
  mode = 'tap',
  reviewMs = minimumReviewMs,
  holdMs = fullHoldMs,
  disabled = false,
  onConfirm,
}: ApprovalConfirmProps) {
  const [reviewedKey, setReviewedKey] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const firedKey = useRef<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewed = reviewedKey === requestKey;

  useEffect(() => {
    const timer = setTimeout(() => setReviewedKey(requestKey), reviewMs);
    return () => {
      clearTimeout(timer);
      clearHoldTimer(holdTimer);
      setHolding(false);
    };
  }, [requestKey, reviewMs]);

  function fire() {
    if (disabled || !reviewed || firedKey.current === requestKey) return;
    firedKey.current = requestKey;
    onConfirm();
  }

  function cancelHold() {
    clearHoldTimer(holdTimer);
    setHolding(false);
  }

  function startHold() {
    if (disabled || !reviewed || holdTimer.current || firedKey.current === requestKey) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      fire();
    }, holdMs);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
    event.preventDefault();
    startHold();
  }

  if (mode === 'hold') {
    return (
      <Button
        type="button"
        fullWidth
        position="relative"
        overflow="hidden"
        disabled={disabled}
        data-reviewed={reviewed}
        aria-label={`Hold to ${label.toLowerCase()}`}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onKeyDown={onKeyDown}
        onKeyUp={cancelHold}
      >
        <Box
          position="absolute"
          inset={0}
          bg="rgba(255, 255, 255, 0.24)"
          transformOrigin="left"
          style={{
            transform: holding ? 'scaleX(1)' : 'scaleX(0)',
            transition: holding ? `transform ${holdMs}ms linear` : 'transform 150ms ease-out',
          }}
          aria-hidden
        />
        <styled.span position="relative">
          {reviewed ? `Hold to ${label.toLowerCase()}` : label}
        </styled.span>
      </Button>
    );
  }

  return (
    <Button type="button" fullWidth disabled={disabled} data-reviewed={reviewed} onClick={fire}>
      {label}
    </Button>
  );
}
