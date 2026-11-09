import { type ReactNode } from 'react';

import { Stack } from 'leather-styles/jsx';

import { Sheet, SheetHeader } from '@leather.io/ui';

import { PageActions } from './page-actions';

interface ReviewSheetProps {
  title: string;
  isShowing: boolean;
  onClose(): void;
  onConfirm(): void;
  confirmLabel: string;
  isConfirming?: boolean;
  children: ReactNode;
}

export function ReviewSheet({
  title,
  isShowing,
  onClose,
  onConfirm,
  confirmLabel,
  isConfirming = false,
  children,
}: ReviewSheetProps) {
  return (
    <Sheet
      isShowing={isShowing}
      onClose={onClose}
      title={title}
      header={<SheetHeader title={title} />}
      footer={
        <PageActions
          primaryLabel={confirmLabel}
          onPrimary={onConfirm}
          isPrimaryLoading={isConfirming}
          secondaryLabel="Cancel"
          onSecondary={onClose}
        />
      }
    >
      <Stack gap="space.04" px="space.05">
        {children}
      </Stack>
    </Sheet>
  );
}
