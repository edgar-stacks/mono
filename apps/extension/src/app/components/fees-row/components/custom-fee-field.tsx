import { type FormEvent, useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { SharedComponentsSelectors } from '@tests/selectors/shared-component.selectors';
import { Flex, Stack, styled } from 'leather-styles/jsx';

import type { CryptoCurrency, StacksTransactionFeeQuote } from '@leather.io/models';
import { stxToMicroStx } from '@leather.io/utils';

import type { StacksSendFormValues } from '@shared/models/form.model';

import { useFieldError } from '@app/common/form-utils';
import { SendFormWarningMessages } from '@app/common/warning-messages';

interface CustomFeeFieldProps {
  feeCurrencySymbol: CryptoCurrency;
  lowFeeQuote: StacksTransactionFeeQuote;
  setFieldWarning(value: string): void;
  disableFeeSelection?: boolean;
}
export function CustomFeeField({
  feeCurrencySymbol,
  lowFeeQuote,
  setFieldWarning,
  disableFeeSelection,
}: CustomFeeFieldProps) {
  const { control, setValue } = useFormContext<Pick<StacksSendFormValues, 'fee'>>();
  const value = useWatch({ control, name: 'fee' });
  const feeError = useFieldError('fee');

  const checkFieldWarning = useCallback(
    (value: string) => {
      if (feeError) return setFieldWarning('');
      const fee = stxToMicroStx(value);
      if (lowFeeQuote.value.amount.isGreaterThan(fee)) {
        return setFieldWarning(SendFormWarningMessages.AdjustedFeeBelowLowestEstimate);
      }
      return setFieldWarning('');
    },
    [lowFeeQuote, feeError, setFieldWarning]
  );

  return (
    <Stack position="relative">
      <Flex
        alignSelf="flex-end"
        color="ink.text-subdued"
        flexDirection="column"
        justifyContent="center"
        position="relative"
        width="130px"
        textStyle="label.02"
      >
        <styled.label htmlFor="fee" position="absolute" right={4} zIndex={999}>
          {feeCurrencySymbol}
        </styled.label>
        <styled.input
          autoComplete="off"
          borderRadius="xs"
          color="ink.text-subdued"
          data-testid={SharedComponentsSelectors.CustomFeeFieldInput}
          display="block"
          height="32px"
          name="fee"
          disabled={disableFeeSelection}
          onChange={(evt: FormEvent<HTMLInputElement>) => {
            setValue('fee', evt.currentTarget.value);
            // Separating warning check from field validations
            // bc we want the user to be able to submit the form
            // with the low fee warning present.
            checkFieldWarning(evt.currentTarget.value);
          }}
          pr="38px"
          placeholder="0"
          ring="none"
          textAlign="right"
          value={value}
        />
      </Flex>
    </Stack>
  );
}
