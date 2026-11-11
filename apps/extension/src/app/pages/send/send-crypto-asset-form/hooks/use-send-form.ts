import { type FieldValues, type UseFormProps, useForm } from 'react-hook-form';

import { defaultSendFormOptions } from '../send-form.utils';

type UseSendFormProps<T extends FieldValues> = Pick<UseFormProps<T>, 'defaultValues' | 'resolver'>;

export function useSendForm<T extends FieldValues>({
  defaultValues,
  resolver,
}: UseSendFormProps<T>) {
  const form = useForm<T>({ defaultValues, resolver, ...defaultSendFormOptions });

  function onBlur() {
    void form.trigger();
  }

  return { form, onBlur };
}
