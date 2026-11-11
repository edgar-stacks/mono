import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { CloseIcon } from '@leather.io/ui';

import { PopupChrome, popupHeight, popupWidth } from '../canvas/approval-frames';
import { HandshakeAnimation, LeatherLaunchAnimation } from '../pattern/approval-launch-animations';
import { useReducedMotion } from '../pattern/use-reduced-motion';
import type { ApprovalRequester } from '../scenarios/approval-model';

const launchDurationMs = 800;
const dockGapPx = 16;
const popoverInsetPx = 8;

function useDockClearance() {
  const [clearance, setClearance] = useState(0);

  useEffect(() => {
    function measure() {
      const dock = document.querySelector('[data-playground-dock]');
      if (!dock) return setClearance(0);
      const rect = dock.getBoundingClientRect();
      setClearance(Math.max(0, window.innerHeight - rect.top) + dockGapPx);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return clearance;
}

export type PopoverLaunch = 'handshake' | 'logo' | 'none';

interface JourneyWalletPopoverProps {
  open: boolean;
  label: string;
  launch: PopoverLaunch;
  launchKey: string;
  requester: ApprovalRequester;
  onDismiss(): void;
  children: ReactNode;
}

export function JourneyWalletPopover({
  open,
  label,
  launch,
  launchKey,
  requester,
  onDismiss,
  children,
}: JourneyWalletPopoverProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();
  const clearance = useDockClearance();
  const animateLaunch = launch !== 'none' && !reducedMotion;
  const [launching, setLaunching] = useState(animateLaunch);

  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    returnFocusTo.current = active instanceof HTMLElement ? active : null;
    dialogRef.current?.focus();
    return () => {
      returnFocusTo.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !animateLaunch) {
      setLaunching(false);
      return;
    }
    setLaunching(true);
    const timer = setTimeout(() => setLaunching(false), launchDurationMs);
    return () => clearTimeout(timer);
  }, [open, animateLaunch, launchKey]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <>
      <Box position="absolute" inset="0" bg="rgba(0, 0, 0, 0.16)" zIndex="20" aria-hidden />
      <Flex
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        direction="column"
        position="absolute"
        zIndex="30"
        right={`${popoverInsetPx}px`}
        top={`${popoverInsetPx}px`}
        borderRadius="md"
        overflow="hidden"
        bg="ink.background-primary"
        boxShadow="0 16px 48px rgba(0, 0, 0, 0.24)"
        outline="none"
        style={{
          width: `min(${popupWidth}px, calc(100% - ${popoverInsetPx * 2}px))`,
          height: `min(${popupHeight}px, calc(100vh - ${clearance + popoverInsetPx * 2}px), calc(100% - ${popoverInsetPx * 2}px))`,
        }}
      >
        <Flex alignItems="center" pr="space.02">
          <Box flex="1">
            <PopupChrome />
          </Box>
          <styled.button
            type="button"
            onClick={onDismiss}
            aria-label="Close Leather"
            p="space.02"
            borderRadius="round"
            color="ink.text-subdued"
            cursor="pointer"
            _hover={{ bg: 'ink.component-background-hover' }}
          >
            <CloseIcon variant="small" />
          </styled.button>
        </Flex>
        <Box flex="1" minHeight="0" position="relative">
          {launching ? (
            <Flex
              height="100%"
              alignItems="center"
              justifyContent="center"
              data-testid="popover-launch"
            >
              {launch === 'handshake' ? (
                <HandshakeAnimation requester={requester} replayKey={launchKey} />
              ) : (
                <LeatherLaunchAnimation replayKey={launchKey} />
              )}
            </Flex>
          ) : (
            children
          )}
        </Box>
      </Flex>
    </>
  );
}
