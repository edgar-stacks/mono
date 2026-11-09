import type { ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

interface ComplianceBoardProps {
  platform: 'Extension' | 'Mobile';
  children: ReactNode;
}

export function ComplianceBoard({ platform, children }: ComplianceBoardProps) {
  return (
    <Stack gap="space.04">
      <styled.h3 textStyle="label.01" color="ink.text-subdued">
        {platform}
      </styled.h3>
      <Flex
        gap="space.07"
        p="space.06"
        borderWidth={1}
        borderColor="ink.border-default"
        borderRadius="md"
        bg="ink.background-secondary"
        overflowX="auto"
        alignItems="flex-start"
      >
        {children}
      </Flex>
    </Stack>
  );
}

interface ComplianceSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function ComplianceSection({ id, title, description, children }: ComplianceSectionProps) {
  return (
    <Stack as="section" id={id} gap="space.06" scrollMarginTop="space.07">
      <Stack gap="space.02" maxWidth="70ch">
        <styled.h2 textStyle="heading.04">{title}</styled.h2>
        <styled.p textStyle="body.02" color="ink.text-subdued">
          {description}
        </styled.p>
      </Stack>
      {children}
    </Stack>
  );
}
