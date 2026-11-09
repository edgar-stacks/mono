import {
  type FeesErrorReason,
  useFeeEditorContext,
} from '@app/features/fee-editor/fee-editor.context';

import { useRpcSendTransferContext } from './rpc-send-transfer.context';

export function useRpcSendTransferError(): FeesErrorReason | undefined {
  const { availableBalance, feesError } = useFeeEditorContext();
  const { amount, isLoadingBalance } = useRpcSendTransferContext();

  const isInsufficientBalance =
    !isLoadingBalance && availableBalance.amount.isLessThan(amount.amount);
  if (isInsufficientBalance) return 'insufficient-funds';
  return feesError;
}
