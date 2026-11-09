import { useEffect } from 'react';

import { useField } from 'formik';

import { FeeTypes } from '@leather.io/models';

interface SyncFeeCurrencyProps {
  currency: string;
}
export function SyncFeeCurrency({ currency }: SyncFeeCurrencyProps) {
  const [, , feeHelper] = useField<unknown>('fee');
  const [feeCurrencyField, , feeCurrencyHelper] = useField<string>('feeCurrency');
  const [, , feeTypeHelper] = useField<string>('feeType');

  useEffect(() => {
    if (feeCurrencyField.value === currency) return;
    void feeCurrencyHelper.setValue(currency);
    void feeHelper.setValue('');
    void feeTypeHelper.setValue(FeeTypes[FeeTypes.Unknown]);
  }, [currency, feeCurrencyField.value, feeCurrencyHelper, feeHelper, feeTypeHelper]);

  return null;
}
