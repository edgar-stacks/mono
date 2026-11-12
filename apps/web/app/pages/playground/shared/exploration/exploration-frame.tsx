import { type ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { Button } from '@leather.io/ui';

import {
  type ExplorationSize,
  type ExplorationTheme,
  explorationFrameSizes,
} from './exploration-params';

interface ExplorationFrameProps {
  id: string;
  label: string;
  theme: ExplorationTheme;
  size: ExplorationSize;
  children: ReactNode;
  onExpand?(id: string): void;
}

export function ExplorationFrame({
  id,
  label,
  theme,
  size,
  children,
  onExpand,
}: ExplorationFrameProps) {
  const { width, height } = explorationFrameSizes[size];

  return (
    <Flex direction="column" gap="space.02" flexShrink={0}>
      <Flex alignItems="center" justifyContent="space-between" gap="space.02" style={{ width }}>
        <styled.span textStyle="caption.01" color="ink.text-subdued">
          {label} · {theme} · {width}×{height}
        </styled.span>
        {onExpand ? (
          <Button size="sm" variant="ghost" onClick={() => onExpand(id)}>
            Expand
          </Button>
        ) : null}
      </Flex>
      <Box
        data-frame={id}
        data-frame-theme={theme}
        className={theme === 'dark' ? 'dark' : undefined}
        position="relative"
        overflow="hidden"
        borderRadius="md"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="ink.border-default"
        bg="ink.background-primary"
        color="ink.text-primary"
        style={{ width, height }}
      >
        {children}
      </Box>
    </Flex>
  );
}
