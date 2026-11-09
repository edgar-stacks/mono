import { type ReactNode } from 'react';

import { ApproverSelectors } from '@/shared/selectors/approver.selectors';

import { Sheet, type SheetRef } from '@leather.io/ui/native';

interface FeeSheetLayoutProps {
  sheetRef: SheetRef;
  children: ReactNode;
}

export function FeeSheetLayout({ sheetRef, children }: FeeSheetLayoutProps) {
  return (
    <Sheet ref={sheetRef}>
      <Sheet.View pt="5" gap="3" p="3" testID={ApproverSelectors.FeeSheet}>
        {children}
      </Sheet.View>
    </Sheet>
  );
}
