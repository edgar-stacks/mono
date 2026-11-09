import type { ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

interface DetailsSectionProps {
  title: string;
  children: ReactNode;
  isTitleCentered?: boolean;
  testId?: string;
}

export function DetailsSection({
  title,
  children,
  isTitleCentered = false,
  testId,
}: DetailsSectionProps) {
  return (
    <Stack bg="ink.background-primary" py="space.02" width="100%" data-testid={testId}>
      <Flex
        px="space.05"
        py="space.02"
        height="36px"
        alignItems="center"
        justifyContent={isTitleCentered ? 'center' : 'flex-start'}
      >
        <styled.span textStyle="label.02">{title}</styled.span>
      </Flex>
      {children}
    </Stack>
  );
}
