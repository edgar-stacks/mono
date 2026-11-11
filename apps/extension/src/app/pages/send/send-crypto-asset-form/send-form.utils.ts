export function createDefaultInitialFormValues<T extends Record<string, unknown>>(obj: T) {
  return { amount: '', recipient: '', ...obj };
}

export const defaultSendFormOptions = {
  mode: 'onBlur',
  reValidateMode: 'onBlur',
  shouldFocusError: false,
} as const;
