import type { ReactNode } from 'react';

import { Flex, Stack, styled } from 'leather-styles/jsx';

interface BoardSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function BoardSection({ id, title, description, children }: BoardSectionProps) {
  return (
    <Stack id={id} gap="space.06" scrollMarginTop="80px">
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

interface PlatformBoardProps {
  platform: 'Extension' | 'Mobile';
  children: ReactNode;
}

export function PlatformBoard({ platform, children }: PlatformBoardProps) {
  return (
    <Stack gap="space.03">
      <styled.h3 textStyle="label.01" color="ink.text-subdued">
        {platform}
      </styled.h3>
      <Flex
        gap="space.07"
        flexWrap="wrap"
        alignItems="flex-start"
        p="space.06"
        borderRadius="md"
        bg="ink.background-secondary"
        overflowX="auto"
      >
        {children}
      </Flex>
    </Stack>
  );
}

interface BoardVariantProps {
  label: string;
  note?: string;
  children: ReactNode;
}

export function BoardVariant({ label, note, children }: BoardVariantProps) {
  return (
    <Stack gap="space.03">
      <Stack gap="space.01" maxWidth="390px">
        <styled.span textStyle="label.02" color="ink.text-primary">
          {label}
        </styled.span>
        {note && (
          <styled.span textStyle="caption.01" color="ink.text-subdued">
            {note}
          </styled.span>
        )}
      </Stack>
      {children}
    </Stack>
  );
}
