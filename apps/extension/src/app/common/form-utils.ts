import { get, useFormContext, useFormState, useWatch } from 'react-hook-form';

export function useIsFieldDirty(name: string) {
  const { control } = useFormContext();
  const { defaultValues } = useFormState({ control, name });
  const value: unknown = useWatch({ control, name });
  const initialValue: unknown = get(defaultValues, name);
  return value !== initialValue;
}

export function useFieldError(name: string) {
  const { control } = useFormContext();
  const { errors } = useFormState({ control, name });
  const message: unknown = get(errors, `${name}.message`);
  return typeof message === 'string' ? message : undefined;
}

export function useShowFieldError(name: string) {
  const { control } = useFormContext();
  const { submitCount, touchedFields } = useFormState({ control, name });
  const error = useFieldError(name);
  const isDirty = useIsFieldDirty(name);
  const isTouched = !!get(touchedFields, name);
  const isFieldInFocus = document.activeElement?.getAttribute('name') === name;

  return !!((submitCount > 0 && error) || (!isFieldInFocus && isTouched && isDirty && error));
}
