import { Flex, styled } from 'leather-styles/jsx';

import { ArrowLeftIcon, CloseIcon, IconButton } from '@leather.io/ui';

interface PageHeaderProps {
  title: string;
  onBack?(): void;
  onClose?(): void;
}

export function PageHeader({ title, onBack, onClose }: PageHeaderProps) {
  return (
    <Flex
      alignItems="center"
      gap="space.02"
      px="space.04"
      minHeight="headerHeight"
      width="100%"
      data-recipe="page-header"
    >
      {onBack ? (
        <IconButton icon={<ArrowLeftIcon />} aria-label="Go back" onClick={onBack} />
      ) : null}
      <styled.h1 flex={1} textStyle="heading.05" color="ink.text-primary" truncate>
        {title}
      </styled.h1>
      {onClose ? <IconButton icon={<CloseIcon />} aria-label="Close" onClick={onClose} /> : null}
    </Flex>
  );
}
