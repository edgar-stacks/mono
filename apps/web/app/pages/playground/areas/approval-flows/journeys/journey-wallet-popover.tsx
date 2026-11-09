import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { CloseIcon, LeatherLettermarkIcon } from '@leather.io/ui';

import { popupHeight } from '../canvas/approval-frames';

const popoverInset = 16;
const dockGap = 12;
const minimumHeight = 320;

interface PopoverBounds {
  top: number;
  height: number;
}

function usePopoverBounds(isOpen: boolean): PopoverBounds {
  const [bounds, setBounds] = useState<PopoverBounds>({ top: popoverInset, height: popupHeight });

  useEffect(() => {
    function measure() {
      const strip = document.querySelector('[data-journey-strip]');
      const dock = document.querySelector('[data-playground-dock]');
      const top = (strip ? strip.getBoundingClientRect().bottom : 0) + popoverInset / 2;
      const bottom = dock ? dock.getBoundingClientRect().top - dockGap : window.innerHeight;
      setBounds({ top, height: Math.max(minimumHeight, Math.min(popupHeight, bottom - top)) });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isOpen]);

  return bounds;
}

interface JourneyWalletPopoverProps {
  isOpen: boolean;
  label: string;
  returnFocusRef: RefObject<HTMLElement | null>;
  onDismiss(): void;
  children: ReactNode;
}

export function JourneyWalletPopover({
  isOpen,
  label,
  returnFocusRef,
  onDismiss,
  children,
}: JourneyWalletPopoverProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bounds = usePopoverBounds(isOpen);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isOpen) {
      containerRef.current?.focus();
    } else if (wasOpen.current) {
      returnFocusRef.current?.focus();
    }
    wasOpen.current = isOpen;
  }, [isOpen, returnFocusRef]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  return (
    <Flex
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      tabIndex={-1}
      direction="column"
      position="fixed"
      zIndex={1200}
      right={{ base: '8px', md: '16px' }}
      left={{ base: '8px', md: 'auto' }}
      overflow="hidden"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      bg="ink.background-primary"
      boxShadow="0 16px 48px rgba(0,0,0,0.24)"
      outline="none"
      width={{ base: 'auto', md: '360px' }}
      style={{ top: bounds.top, height: bounds.height }}
      data-wallet-popover
    >
      <Flex
        alignItems="center"
        justifyContent="space-between"
        px="space.03"
        py="space.02"
        borderBottomWidth="1px"
        borderStyle="solid"
        borderColor="ink.border-default"
      >
        <Flex alignItems="center" gap="space.02" color="ink.text-primary">
          <LeatherLettermarkIcon />
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            Leather
          </styled.span>
        </Flex>
        <styled.button
          type="button"
          aria-label="Close wallet"
          onClick={onDismiss}
          display="flex"
          p="space.01"
          borderRadius="sm"
          color="ink.text-primary"
          _hover={{ bg: 'ink.background-secondary' }}
        >
          <CloseIcon variant="small" />
        </styled.button>
      </Flex>
      <Box display="flex" flexDirection="column" flex={1} minHeight={0}>
        {children}
      </Box>
    </Flex>
  );
}
