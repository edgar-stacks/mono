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
  const error: unknown = get(errors, name);
  if (typeof error !== 'object' || error === null || !('message' in error)) return undefined;
  return typeof error.message === 'string' ? error.message : undefined;
}

export function useShowFieldError(name: string) {
  const { control } = useFormContext();
  const { submitCount, touchedFields } = useFormState({ control, name });
  const error = useFieldError(name);
  const isTouched = !!get(touchedFields, name);
  const isDirty = useIsFieldDirty(name);
  const isFieldInFocus = document.activeElement?.getAttribute('name') === name;
  const hasError = !!error;

  return (submitCount > 0 && hasError) || (!isFieldInFocus && isTouched && isDirty && hasError);
}
