import { type ReactNode } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <Flex alignItems="center" justifyContent="space-between" gap="space.02" minHeight="32px">
      <styled.h2 textStyle="label.02" color="ink.text-subdued">
        {title}
      </styled.h2>
      {action}
    </Flex>
  );
}
