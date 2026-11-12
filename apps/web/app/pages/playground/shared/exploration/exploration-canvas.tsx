import { type ReactNode } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

import { dockClearance } from '../../components/playground-dock';

interface ExplorationCanvasProps {
  title: string;
  description?: string;
  controls?: ReactNode;
  children: ReactNode;
}

export function ExplorationCanvas({
  title,
  description,
  controls,
  children,
}: ExplorationCanvasProps) {
  return (
    <Flex
      direction="column"
      gap="space.07"
      minHeight="100vh"
      p="space.06"
      bg="ink.background-secondary"
      style={{ paddingBottom: dockClearance * 2 }}
    >
      <Flex direction="column" gap="space.03" maxWidth="720px">
        <styled.h1 textStyle="heading.03" color="ink.text-primary">
          {title}
        </styled.h1>
        {description ? (
          <styled.p textStyle="body.02" color="ink.text-subdued">
            {description}
          </styled.p>
        ) : null}
        {controls}
      </Flex>
      {children}
    </Flex>
  );
}
