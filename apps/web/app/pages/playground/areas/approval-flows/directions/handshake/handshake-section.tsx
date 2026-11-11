import { Flex, styled } from 'leather-styles/jsx';

import type { DirectionSectionProps } from '../direction-types';

export function HandshakeSection({ title, children }: DirectionSectionProps) {
  return (
    <Flex
      direction="column"
      gap="space.01"
      px="space.04"
      py="space.03"
      borderRadius="md"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="ink.border-transparent"
      bg="ink.background-primary"
    >
      <styled.span textStyle="caption.02" color="ink.text-subdued" textTransform="uppercase">
        {title}
      </styled.span>
      {children}
    </Flex>
  );
}
