import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

import type { Money } from '@leather.io/models';

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
  const { resetField, setValue } = useFormContext<{
    amount: number | string;
    fee: number | string;
  }>();
  const toast = useToast();

  return useCallback(() => {
    analytics.track('select_maximum_amount_for_send');
    if (balance.amount.isLessThanOrEqualTo(0)) {
      toast.error('Zero balance');
      return;
    }
    onSetIsSendingMax(!isSendingMax);
    setValue('fee', sendMaxFee, { shouldDirty: true });
    resetField('amount');
    setValue('amount', sendMaxBalance, { shouldDirty: true });
  }, [
    balance.amount,
    resetField,
    setValue,
    isSendingMax,
    onSetIsSendingMax,
    sendMaxBalance,
    sendMaxFee,
    toast,
  ]);
}
