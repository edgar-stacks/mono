import { type ReactNode } from 'react';

import { Flex, styled } from 'leather-styles/jsx';

import { ArrowLeftIcon, IconButton } from '@leather.io/ui';

interface PageHeaderProps {
  title: string;
  onBack?(): void;
  trailing?: ReactNode;
}

export function PageHeader({ title, onBack, trailing }: PageHeaderProps) {
  return (
    <Flex
      as="header"
      alignItems="center"
      gap="space.02"
      px="space.04"
      minHeight="popupHeaderHeight"
      flexShrink={0}
    >
      {onBack && <IconButton icon={<ArrowLeftIcon />} onClick={onBack} aria-label="Back" />}
      <styled.h1 textStyle="heading.05" flex="1" minWidth={0} truncate>
        {title}
      </styled.h1>
      {trailing}
    </Flex>
  );
}
