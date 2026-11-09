import { type ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

interface ExplorationRailProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ExplorationRail({ title, description, children }: ExplorationRailProps) {
  return (
    <Stack gap="space.03" data-rail={title}>
      <Stack gap="space.01">
        <styled.h2 textStyle="heading.05">{title}</styled.h2>
        {description && (
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            {description}
          </styled.p>
        )}
      </Stack>
      <Flex gap="space.05" alignItems="flex-start" overflowX="auto" pb="space.02">
        {children}
      </Flex>
    </Stack>
  );
}
