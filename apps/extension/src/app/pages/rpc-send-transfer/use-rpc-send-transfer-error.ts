import {
  type FeesErrorReason,
  useFeeEditorContext,
} from '@app/features/fee-editor/fee-editor.context';

import { useRpcSendTransferContext } from './rpc-send-transfer.context';

export const rpcSendTransferErrorMessages: Record<FeesErrorReason, string> = {
  'insufficient-funds':
    "This account doesn't have enough funds for this transfer. Switch account or cancel the request.",
  'fee-estimation-failed': 'Unable to estimate network fees for this request',
};

export function useRpcSendTransferError(): FeesErrorReason | undefined {
  const { availableBalance, feesError } = useFeeEditorContext();
  const { amount, isLoadingBalance } = useRpcSendTransferContext();

  if (isLoadingBalance) return;
  if (availableBalance.amount.isLessThan(amount.amount)) return 'insufficient-funds';
  return feesError;
}
