import { useEffect } from 'react';

import { useFormikContext } from 'formik';

import { FeeTypes } from '@leather.io/models';

import type { StacksSendFormValues } from '@shared/models/form.model';

interface FeeCurrencySyncProps {
  feeCurrency: string;
}
export function FeeCurrencySync({ feeCurrency }: FeeCurrencySyncProps) {
  const { values, setFieldValue } = useFormikContext<StacksSendFormValues>();

  useEffect(() => {
    if (values.feeCurrency === feeCurrency) return;
    void setFieldValue('feeCurrency', feeCurrency);
    void setFieldValue('fee', '');
    void setFieldValue('feeType', FeeTypes[FeeTypes.Unknown]);
  }, [feeCurrency, setFieldValue, values.feeCurrency]);

  return null;
}
