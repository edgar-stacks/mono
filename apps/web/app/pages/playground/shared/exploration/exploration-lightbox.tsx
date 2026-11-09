import { type ReactNode, useEffect } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { CloseIcon, IconButton } from '@leather.io/ui';

interface ExplorationLightboxProps {
  label: string;
  onClose(): void;
  children: ReactNode;
}

export function ExplorationLightbox({ label, onClose, children }: ExplorationLightboxProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <Flex
      role="dialog"
      aria-modal="true"
      aria-label={label}
      position="fixed"
      inset={0}
      zIndex={1200}
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap="space.04"
      bg="overlay"
      onClick={onClose}
    >
      <Flex alignItems="center" gap="space.03" onClick={event => event.stopPropagation()}>
        <styled.span textStyle="label.02" color="ink.background-primary">
          {label}
        </styled.span>
        <IconButton icon={<CloseIcon color="ink.background-primary" />} onClick={onClose} />
      </Flex>
      <Box
        transform="scale(1.25)"
        transformOrigin="top center"
        onClick={event => event.stopPropagation()}
      >
        {children}
      </Box>
    </Flex>
  );
}
