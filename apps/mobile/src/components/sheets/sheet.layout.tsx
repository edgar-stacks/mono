import { type ReactNode } from 'react';

import { Box, Sheet, type SheetProps, type SheetRef } from '@leather.io/ui/native';

interface SheetLayoutProps extends Omit<SheetProps, 'children' | 'ref'> {
  sheetRef: SheetRef;
  children: ReactNode;
  title: string;
  testID?: string;
}
export function SheetLayout({
  children,
  sheetRef,
  title,
  testID,
  ...sheetProps
}: SheetLayoutProps) {
  return (
    <Sheet ref={sheetRef} {...sheetProps}>
      <Sheet.View gap="3" testID={testID}>
        <Sheet.Header leftElement={<Sheet.Title>{title}</Sheet.Title>} />
        <Box px="5">{children}</Box>
      </Sheet.View>
    </Sheet>
  );
}
