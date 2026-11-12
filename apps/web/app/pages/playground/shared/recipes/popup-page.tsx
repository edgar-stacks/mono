import { type ReactNode } from 'react';

import { Box, Flex } from 'leather-styles/jsx';

interface PopupPageProps {
  header: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

export function PopupPage({ header, children, actions }: PopupPageProps) {
  return (
    <Flex
      direction="column"
      width="100%"
      height="100%"
      minHeight={0}
      bg="ink.background-primary"
      color="ink.text-primary"
      data-recipe="popup-page"
    >
      <Box flexShrink={0}>{header}</Box>
      <Box flex={1} minHeight={0} overflowY="auto" px="space.05" py="space.04">
        {children}
      </Box>
      {actions ? (
        <Box
          flexShrink={0}
          p="space.05"
          bg="ink.background-primary"
          boxShadow="contentOverflowFade"
        >
          {actions}
        </Box>
      ) : null}
    </Flex>
  );
}
