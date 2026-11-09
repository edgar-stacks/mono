import { get, useFormContext, useFormState, useWatch } from 'react-hook-form';

export function useIsFieldDirty(name: string) {
  const { control } = useFormContext();
  const value: unknown = useWatch({ control, name });
  const { defaultValues } = useFormState({ control, name });
  const initialValue: unknown = get(defaultValues, name);
  return value !== initialValue;
}

export function useFieldError(name: string) {
  const { control, getFieldState } = useFormContext();
  const formState = useFormState({ control, name });
  return getFieldState(name, formState).error?.message;
}

export function useShowFieldError(name: string) {
  const { control, getFieldState } = useFormContext();
  const formState = useFormState({ control, name });
  const { error, isTouched } = getFieldState(name, formState);
  const isDirty = useIsFieldDirty(name);
  const isFieldInFocus = document.activeElement?.getAttribute('name') === name;

  return !!(
    (formState.submitCount > 0 && error?.message) ||
    (!isFieldInFocus && isTouched && isDirty && error?.message)
  );
}
