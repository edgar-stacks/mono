import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

import { LeatherLogomarkIcon } from '@leather.io/ui';

const popupWidth = '390px';
const popupHeight = '600px';
const requestWindowHeight = '640px';
const tabWidth = '760px';
const tabHeight = '560px';
const tabColumnWidth = '440px';

interface FrameProps {
  children: ReactNode;
}

function WindowDots() {
  return (
    <Flex gap="6px">
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

function AppBar() {
  return (
    <Flex
      alignItems="center"
      height="48px"
      px="space.05"
      flexShrink={0}
      borderBottomWidth={1}
      borderColor="ink.border-transparent"
    >
      <LeatherLogomarkIcon />
    </Flex>
  );
}

export function PopupFrame({ children }: FrameProps) {
  return (
    <Flex
      direction="column"
      width={popupWidth}
      height={popupHeight}
      flexShrink={0}
      overflow="hidden"
      borderRadius="sm"
      borderWidth={1}
      borderColor="ink.border-default"
      bg="ink.background-primary"
      boxShadow="0 12px 32px rgba(0,0,0,0.12)"
    >
      <AppBar />
      <Box flex={1} minHeight={0}>
        {children}
      </Box>
    </Flex>
  );
}

export function RequestWindowFrame({ children }: FrameProps) {
  return (
    <Flex
      direction="column"
      width={popupWidth}
      height={requestWindowHeight}
      flexShrink={0}
      overflow="hidden"
      borderRadius="md"
      borderWidth={1}
      borderColor="ink.border-default"
      bg="ink.background-primary"
      boxShadow="0 12px 32px rgba(0,0,0,0.16)"
    >
      <Flex
        alignItems="center"
        gap="space.03"
        height="28px"
        px="space.03"
        flexShrink={0}
        bg="ink.background-secondary"
      >
        <WindowDots />
        <styled.span textStyle="caption.02" color="ink.text-subdued">
          Leather
        </styled.span>
      </Flex>
      <AppBar />
      <Box flex={1} minHeight={0}>
        {children}
      </Box>
    </Flex>
  );
}

export function FullPageTabFrame({ children }: FrameProps) {
  return (
    <Flex
      direction="column"
      width={tabWidth}
      height={tabHeight}
      flexShrink={0}
      overflow="hidden"
      borderRadius="md"
      borderWidth={1}
      borderColor="ink.border-default"
      bg="ink.background-primary"
      boxShadow="0 12px 32px rgba(0,0,0,0.12)"
    >
      <Flex
        alignItems="center"
        gap="space.04"
        height="36px"
        px="space.03"
        flexShrink={0}
        bg="ink.background-secondary"
      >
        <WindowDots />
        <styled.span
          textStyle="caption.02"
          px="space.03"
          py="space.01"
          borderRadius="xs"
          bg="ink.background-primary"
          color="ink.text-subdued"
          flex={1}
        >
          chrome-extension://leather/index.html#/
        </styled.span>
      </Flex>
      <AppBar />
      <Flex flex={1} minHeight={0} justifyContent="center">
        <Box width={tabColumnWidth} height="100%">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
