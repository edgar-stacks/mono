import { InputSheetLayout } from '@/components/sheets/input-sheet.layout';
import { AccountSelectors } from '@/shared/selectors/account.selectors';
import { t } from '@lingui/core/macro';

import { type SheetRef } from '@leather.io/ui/native';

interface AccountNameSheetProps {
  sheetRef: SheetRef;
  name: string;
  setName(name: string): { success: boolean };
}
export function AccountNameSheet({ sheetRef, name, setName }: AccountNameSheetProps) {
  return (
    <InputSheetLayout
      sheetRef={sheetRef}
      initialValue={name}
      title={t`Account label`}
      placeholder={t`Name`}
      submitTitle={t`Save`}
      onSubmit={newName => {
        const { success } = setName(newName);
        if (success) {
          sheetRef.current?.close();
        }
      }}
      inputTestId={AccountSelectors.ChangeNameSheetInput}
      submitTestId={AccountSelectors.ChangeNameSheetSaveButton}
    />
  );
}
