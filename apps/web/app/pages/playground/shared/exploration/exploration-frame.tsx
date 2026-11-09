import { type ReactNode } from 'react';

import { Box, Stack, styled } from 'leather-styles/jsx';

import { type ExplorationTheme, type ExplorationWidth } from './exploration-params';

const frameWidths: Record<ExplorationWidth, string> = {
  popup: '390px',
  narrow: '320px',
};

interface ExplorationFrameProps {
  id: string;
  label: string;
  theme: ExplorationTheme;
  width?: ExplorationWidth;
  height?: string;
  onOpen?(id: string): void;
  children: ReactNode;
}

export function ExplorationFrame({
  id,
  label,
  theme,
  width = 'popup',
  height = '600px',
  onOpen,
  children,
}: ExplorationFrameProps) {
  return (
    <Stack gap="space.02" flexShrink={0}>
      <styled.button
        type="button"
        textAlign="left"
        textStyle="label.03"
        color="ink.text-subdued"
        cursor={onOpen ? 'zoom-in' : 'default'}
        onClick={() => onOpen?.(id)}
      >
        {label}
      </styled.button>
      <Box
        data-frame={id}
        className={theme}
        position="relative"
        style={{ width: frameWidths[width], height }}
        overflow="auto"
        borderRadius="md"
        border="default"
        bg="ink.background-primary"
        color="ink.text-primary"
      >
        {children}
      </Box>
    </Stack>
  );
}
