import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import type { Money } from '@leather.io/models';

import type { BitcoinSendFormValues } from '@shared/models/form.model';
import { analytics } from '@shared/utils/analytics';

import { useToast } from '@app/features/toasts/use-toast';

interface UseSendMaxArgs {
  balance: Money;
  isSendingMax?: boolean;
  onSetIsSendingMax(value: boolean): void;
  sendMaxBalance: string;
  sendMaxFee: string;
}
export function useSendMax({
  balance,
  isSendingMax,
  onSetIsSendingMax,
  sendMaxBalance,
  sendMaxFee,
}: UseSendMaxArgs) {
  const { resetField, setValue } = useFormContext<Pick<BitcoinSendFormValues, 'amount' | 'fee'>>();
  const toast = useToast();

  return useCallback(() => {
    analytics.track('select_maximum_amount_for_send');
    if (balance.amount.isLessThanOrEqualTo(0)) {
      toast.error('Zero balance');
      return;
    }
    onSetIsSendingMax(!isSendingMax);
    setValue('fee', sendMaxFee);
    resetField('amount');
    setValue('amount', sendMaxBalance);
  }, [
    balance.amount,
    isSendingMax,
    onSetIsSendingMax,
    resetField,
    sendMaxBalance,
    sendMaxFee,
    setValue,
    toast,
  ]);
}
