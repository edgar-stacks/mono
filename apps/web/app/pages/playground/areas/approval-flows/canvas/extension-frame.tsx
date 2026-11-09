import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

export const popupWidth = 360;
export const popupHeight = 600;

interface ExtensionFrameProps {
  label: string;
  children: ReactNode;
}

export function ExtensionFrame({ label, children }: ExtensionFrameProps) {
  return (
    <Flex direction="column" gap="space.02" flexShrink={0} maxWidth="100%">
      <styled.span textStyle="caption.01" color="ink.text-subdued">
        {label}
      </styled.span>
      <Box
        position="relative"
        overflow="hidden"
        borderRadius="md"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="ink.border-default"
        bg="ink.background-primary"
        boxShadow="0 12px 40px rgba(0,0,0,0.12)"
        maxWidth="100%"
        style={{ width: popupWidth, height: popupHeight }}
      >
        {children}
      </Box>
    </Flex>
  );
}
