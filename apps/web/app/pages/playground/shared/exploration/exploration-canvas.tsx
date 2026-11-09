import { type ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

import { dockClearance } from '../../components/playground-dock';

interface ExplorationCanvasProps {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
}

export function ExplorationCanvas({
  title,
  description,
  toolbar,
  children,
}: ExplorationCanvasProps) {
  return (
    <Stack
      gap="space.07"
      minHeight="100vh"
      px="space.07"
      pt="space.07"
      bg="ink.background-secondary"
      style={{ paddingBottom: dockClearance * 2 }}
    >
      <Flex alignItems="flex-end" justifyContent="space-between" gap="space.05" flexWrap="wrap">
        <Stack gap="space.02" maxWidth="640px">
          <styled.h1 textStyle="heading.03">{title}</styled.h1>
          {description && (
            <styled.p textStyle="body.02" color="ink.text-subdued">
              {description}
            </styled.p>
          )}
        </Stack>
        {toolbar}
      </Flex>
      {children}
    </Stack>
  );
}
