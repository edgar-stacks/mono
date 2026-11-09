import { type ReactNode } from 'react';

import { Box, Flex, VStack, styled } from 'leather-styles/jsx';

import { MarketingBadge } from './marketing-badge';

interface FeatureCardProps {
  title: string;
  description: string;
  badge?: string;
  media: ReactNode;
}

export function FeatureCard({ title, description, badge, media }: FeatureCardProps) {
  return (
    <VStack
      alignItems="stretch"
      gap={0}
      bg="ink.background-secondary"
      borderRadius="md"
      overflow="hidden"
      height="100%"
    >
      <Flex flex={1} alignItems="center" justifyContent="center" p="space.05" minHeight="220px">
        <Box width="100%" maxWidth="420px">
          {media}
        </Box>
      </Flex>
      <Box px="space.05" pb="space.06">
        <Flex alignItems="center" gap="space.03" flexWrap="wrap">
          <styled.h3 textStyle="heading.05">{title}</styled.h3>
          {badge && <MarketingBadge>{badge}</MarketingBadge>}
        </Flex>
        <styled.p mt="space.02" textStyle="body.01" color="ink.text-subdued">
          {description}
        </styled.p>
      </Box>
    </VStack>
  );
}
