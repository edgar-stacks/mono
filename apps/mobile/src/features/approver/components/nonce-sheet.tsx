import { InputSheetLayout } from '@/components/sheets/input-sheet.layout';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { t } from '@lingui/core/macro';

import { type SheetRef } from '@leather.io/ui/native';

interface NonceSheetProps {
  sheetRef: SheetRef;
  nonce: string;
  onChangeNonce(nonce: string): void;
}
export function NonceSheet({ sheetRef, nonce, onChangeNonce }: NonceSheetProps) {
  return (
    <InputSheetLayout
      sheetRef={sheetRef}
      initialValue={nonce}
      title={t`Add memo`}
      placeholder={t`Memo`}
      submitTitle={t`Confirm`}
      inputTestId={ApproverSelectors.NonceSheetInput}
      submitTestId={ApproverSelectors.NonceSheetSubmitButton}
      onSubmit={value => {
        onChangeNonce(value);
        sheetRef.current?.close();
      }}
    />
  );
}
