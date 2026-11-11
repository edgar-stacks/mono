import type { ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

const phoneWidth = '375px';
const phoneHeight = '760px';

interface PhoneFrameProps {
  children: ReactNode;
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <Flex
      direction="column"
      width={phoneWidth}
      height={phoneHeight}
      flexShrink={0}
      overflow="hidden"
      borderRadius="40px"
      borderWidth="8px"
      borderColor="ink.text-primary"
      bg="ink.background-primary"
    >
      <Flex
        alignItems="center"
        justifyContent="space-between"
        height="44px"
        px="space.06"
        flexShrink={0}
      >
        <styled.span textStyle="label.03" color="ink.text-primary">
          9:41
        </styled.span>
        <Box width="96px" height="24px" borderRadius="round" bg="ink.text-primary" />
        <styled.span textStyle="label.03" color="ink.text-primary">
          100%
        </styled.span>
      </Flex>
      <Box flex={1} minHeight={0}>
        {children}
      </Box>
      <Flex justifyContent="center" py="space.02" flexShrink={0}>
        <Box width="120px" height="4px" borderRadius="round" bg="ink.text-primary" />
      </Flex>
    </Flex>
  );
}
