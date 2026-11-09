import type { ReactNode } from 'react';

import { Box, Stack } from 'leather-styles/jsx';

import { Content } from '@app/components/layout';

import { DetailsHeader } from './details-header';

interface DetailsScreenProps {
  title: string;
  children: ReactNode;
  onBack(): void;
  testId?: string;
  backTestId: string;
  titleTestId: string;
}

export function DetailsScreen({
  title,
  children,
  onBack,
  testId,
  backTestId,
  titleTestId,
}: DetailsScreenProps) {
  return (
    <Content>
      <Stack width="100%" gap="space.00" data-testid={testId}>
        <DetailsHeader
          title={title}
          onBack={onBack}
          backTestId={backTestId}
          titleTestId={titleTestId}
        />
        <Box width="100%" maxWidth={['100%', null, '780px']} margin="0 auto">
          <Stack
            bg="ink.background-primary"
            borderRadius={['0', null, 'md']}
            overflow="hidden"
            gap="space.00"
          >
            {children}
          </Stack>
        </Box>
      </Stack>
    </Content>
  );
}
