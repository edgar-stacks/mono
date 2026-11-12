import { type ReactNode } from 'react';

import { Flex } from 'leather-styles/jsx';

import { Sheet, SheetHeader } from '@leather.io/ui';

interface ExplorationLightboxProps {
  title: string;
  isShowing: boolean;
  children: ReactNode;
  onClose(): void;
}

export function ExplorationLightbox({
  title,
  isShowing,
  children,
  onClose,
}: ExplorationLightboxProps) {
  return (
    <Sheet
      isShowing={isShowing}
      onClose={onClose}
      title={title}
      header={<SheetHeader title={title} />}
      maxWidth="960px"
      contentMaxVh={90}
    >
      <Flex justifyContent="center" p="space.05">
        {children}
      </Flex>
    </Sheet>
  );
}
