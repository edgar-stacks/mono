import { type ReactNode } from 'react';

import { Box, Flex, styled } from 'leather-styles/jsx';

interface FeatureCardProps {
  title: string;
  description: string;
  platform?: 'Mobile' | 'Extension';
  media: ReactNode;
  action?: ReactNode;
}

export function FeatureCard({ title, description, platform, media, action }: FeatureCardProps) {
  return (
    <Flex
      flexDir="column"
      justifyContent="space-between"
      gap="space.05"
      bg="ink.background-secondary"
      borderRadius="sm"
      overflow="hidden"
      height="100%"
    >
      <Box position="relative" px="space.05" pt="space.05">
        {media}
        {action}
      </Box>
      <Box px={['space.05', null, 'space.06']} pb={['space.05', null, 'space.06']}>
        <Flex alignItems="center" gap="space.02" flexWrap="wrap">
          <styled.h3 textStyle="heading.05">{title}</styled.h3>
          {platform && (
            <styled.span
              textStyle="caption.02"
              color="ink.text-subdued"
              border="default"
              borderRadius="999px"
              px="space.02"
              py="1px"
            >
              {platform}
            </styled.span>
          )}
        </Flex>
        <styled.p textStyle="body.02" color="ink.text-subdued" mt="space.02" maxWidth="520px">
          {description}
        </styled.p>
      </Box>
    </Flex>
  );
}
