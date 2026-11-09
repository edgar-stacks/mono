import { type ReactNode } from 'react';

import { Flex } from 'leather-styles/jsx';

interface PopupPageProps {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function PopupPage({ header, children, footer }: PopupPageProps) {
  return (
    <Flex
      direction="column"
      width="popupWidth"
      maxWidth="100%"
      height="dialogHeight"
      bg="ink.background-primary"
      overflow="hidden"
    >
      {header}
      <Flex
        direction="column"
        gap="space.05"
        flex="1"
        minHeight={0}
        overflowY="auto"
        px="space.05"
        pb="space.05"
      >
        {children}
      </Flex>
      {footer && (
        <Flex flexShrink={0} p="space.05" borderTop="default">
          {footer}
        </Flex>
      )}
    </Flex>
  );
}
