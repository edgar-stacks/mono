import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { mockDappOrigin } from './compliance-content';

export type ExtensionFrameKind = 'popup' | 'request' | 'tab';

const extensionFrameSizes: Record<ExtensionFrameKind, { width: string; height: string }> = {
  popup: { width: '392px', height: '600px' },
  request: { width: '442px', height: '646px' },
  tab: { width: '880px', height: '600px' },
};

function WindowDots() {
  return (
    <Flex gap="space.01">
      {['#ff5f57', '#febc2e', '#28c840'].map(color => (
        <Box
          key={color}
          width="10px"
          height="10px"
          borderRadius="round"
          style={{ background: color }}
        />
      ))}
    </Flex>
  );
}

interface FrameChromeProps {
  kind: ExtensionFrameKind;
}

function FrameChrome({ kind }: FrameChromeProps) {
  if (kind === 'popup') return null;
  return (
    <Flex
      alignItems="center"
      gap="space.03"
      px="space.03"
      height="32px"
      flexShrink={0}
      bg="ink.background-secondary"
      borderBottom="default"
    >
      <WindowDots />
      <styled.span textStyle="caption.02" color="ink.text-subdued" truncate>
        {kind === 'request'
          ? `Leather · ${mockDappOrigin}`
          : 'chrome-extension://leather/index.html'}
      </styled.span>
    </Flex>
  );
}

interface ExtensionFrameProps {
  kind: ExtensionFrameKind;
  children: ReactNode;
}

export function ExtensionFrame({ kind, children }: ExtensionFrameProps) {
  const size = extensionFrameSizes[kind];
  return (
    <Flex
      direction="column"
      flexShrink={0}
      overflow="hidden"
      bg="ink.background-primary"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-default"
      borderRadius={kind === 'popup' ? 'sm' : 'md'}
      boxShadow="0 12px 32px rgba(0, 0, 0, 0.12)"
      style={{ width: size.width, height: size.height }}
    >
      <FrameChrome kind={kind} />
      <Flex direction="column" flex={1} minHeight={0}>
        {kind === 'tab' ? (
          <Flex direction="column" flex={1} width="100%" maxWidth="480px" mx="auto" minHeight={0}>
            {children}
          </Flex>
        ) : (
          children
        )}
      </Flex>
    </Flex>
  );
}
