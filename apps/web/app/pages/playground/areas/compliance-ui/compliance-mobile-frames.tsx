import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

interface MobileFrameProps {
  children: ReactNode;
}

export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <Flex
      direction="column"
      flexShrink={0}
      width="375px"
      height="760px"
      overflow="hidden"
      bg="ink.background-primary"
      borderWidth="8px"
      borderStyle="solid"
      borderColor="ink.text-primary"
      borderRadius="44px"
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        px="space.06"
        pt="space.03"
        height="44px"
      >
        <styled.span textStyle="label.03">9:41</styled.span>
        <Box width="96px" height="24px" borderRadius="round" bg="ink.text-primary" />
        <styled.span textStyle="label.03">100%</styled.span>
      </Flex>
      <Flex direction="column" flex={1} minHeight={0}>
        {children}
      </Flex>
      <Flex justifyContent="center" py="space.02">
        <Box width="120px" height="4px" borderRadius="round" bg="ink.text-primary" />
      </Flex>
    </Flex>
  );
}
