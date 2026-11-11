import { FormProvider } from 'react-hook-form';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import { createFormResolver } from '@app/common/validation/form-resolver';

import { useSendForm } from './use-send-form';

interface TestFormValues {
  amount: string;
  fee: string;
}

const insufficientBalanceMessage = 'Insufficient balance';
const balance = 10;

function readFee(values: unknown) {
  const result = z.object({ fee: z.coerce.number() }).safeParse(values);
  return result.success ? result.data.fee : 0;
}

const resolver = createFormResolver<TestFormValues>(values =>
  z.object({
    amount: z
      .string()
      .refine(amount => Number(amount) + readFee(values) <= balance, insufficientBalanceMessage),
    fee: z.string(),
  })
);

function TestForm() {
  const { form, onBlur } = useSendForm<TestFormValues>({
    defaultValues: { amount: '', fee: '0.05' },
    resolver,
  });

  return (
    <FormProvider {...form}>
      <form onBlur={onBlur}>
        <input aria-label="amount" {...form.register('amount')} />
        <input aria-label="fee" {...form.register('fee')} />
        <input aria-label="memo" name="memo" />
        <span role="alert">{form.formState.errors.amount?.message}</span>
      </form>
    </FormProvider>
  );
}

function changeAndBlur(label: string, value: string) {
  const input = screen.getByLabelText(label);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

describe(useSendForm.name, () => {
  afterEach(() => {
    cleanup();
  });

  test('re-validates other fields when any field blurs', async () => {
    render(<TestForm />);

    changeAndBlur('amount', '9.9');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(''));

    changeAndBlur('fee', '0.5');
    fireEvent.blur(screen.getByLabelText('memo'));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(insufficientBalanceMessage)
    );

    changeAndBlur('fee', '0.05');
    fireEvent.blur(screen.getByLabelText('memo'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(''));
  });
});
