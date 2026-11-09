import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { CloseIcon } from '@leather.io/ui';

import { popupHeight, popupWidth } from '../canvas/extension-frame';
import { usePrefersReducedMotion } from '../pattern/use-prefers-reduced-motion';
import { JourneyLaunchMark, launchDrawMs } from './journey-launch-mark';

const launchHoldMs = launchDrawMs + 240;

function focusElement(target: RefObject<HTMLElement | null>) {
  target.current?.focus();
}

interface JourneyWalletPopoverProps {
  launch: 'handshake' | 'logo';
  returnFocusTo: RefObject<HTMLElement | null>;
  bottomInset: number;
  onDismiss(): void;
  children: ReactNode;
}

export function JourneyWalletPopover({
  launch,
  returnFocusTo,
  bottomInset,
  onDismiss,
  children,
}: JourneyWalletPopoverProps) {
  const reducedMotion = usePrefersReducedMotion();
  const drawLogo = launch === 'logo' && !reducedMotion;
  const [launching, setLaunching] = useState(drawLogo);
  const panel = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);

  useEffect(() => {
    dismiss.current = onDismiss;
  });

  useEffect(() => {
    if (!drawLogo) return;
    const timer = setTimeout(() => setLaunching(false), launchHoldMs);
    return () => clearTimeout(timer);
  }, [drawLogo]);

  useEffect(() => {
    panel.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      focusElement(returnFocusTo);
    };
  }, [returnFocusTo]);

  return (
    <Box position="fixed" inset={0} zIndex={1200} bg="rgba(12, 12, 13, 0.24)">
      <Flex
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Leather"
        tabIndex={-1}
        direction="column"
        position="absolute"
        top={{ base: 'space.02', md: 'space.04' }}
        right={{ base: 'space.02', md: 'space.06' }}
        overflow="hidden"
        borderRadius="md"
        bg="ink.background-primary"
        boxShadow="0 16px 48px rgba(0,0,0,0.28)"
        outline="none"
        style={{
          width: `min(${popupWidth}px, calc(100vw - 16px))`,
          height: `min(${popupHeight}px, calc(100vh - ${bottomInset + 24}px))`,
        }}
      >
        <Flex
          alignItems="center"
          justifyContent="space-between"
          px="space.04"
          py="space.02"
          borderBottomWidth="1px"
          borderBottomStyle="solid"
          borderColor="ink.border-default"
        >
          <styled.span textStyle="label.03" color="ink.text-subdued">
            Leather
          </styled.span>
          <styled.button
            type="button"
            aria-label="Close Leather"
            onClick={onDismiss}
            display="flex"
            p="space.01"
            borderRadius="sm"
            _hover={{ bg: 'ink.component-background-hover' }}
          >
            <CloseIcon variant="small" color="ink.text-primary" />
          </styled.button>
        </Flex>
        <Box flex={1} minHeight={0} position="relative">
          {launching ? <JourneyLaunchMark /> : children}
        </Box>
      </Flex>
    </Box>
  );
}
