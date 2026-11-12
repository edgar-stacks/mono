import { type ReactNode } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

interface ExplorationRailProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ExplorationRail({ title, description, children }: ExplorationRailProps) {
  return (
    <Flex direction="column" gap="space.04" data-rail={title}>
      <Flex direction="column" gap="space.01">
        <styled.h2 textStyle="label.01" color="ink.text-primary">
          {title}
        </styled.h2>
        {description ? (
          <styled.p textStyle="caption.01" color="ink.text-subdued">
            {description}
          </styled.p>
        ) : null}
      </Flex>
      <Flex gap="space.06" alignItems="flex-start" overflowX="auto" pb="space.03">
        {children}
      </Flex>
    </Flex>
  );
}
