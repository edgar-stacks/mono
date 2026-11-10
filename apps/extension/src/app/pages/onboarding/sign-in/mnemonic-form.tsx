import { FormProvider, useForm } from 'react-hook-form';

import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { Stack } from 'leather-styles/jsx';
import { mapValues } from 'remeda';

import { Button } from '@leather.io/ui';
import { isEmpty } from '@leather.io/utils';

import { useLatestCallback } from '@app/common/hooks/use-latest-callback';
import { ErrorLabel } from '@app/components/error-label';
import { MnemonicWordInput } from '@app/ui/components/secret-key/mnemonic-key/mnemonic-word-input';
import {
  type MnemonicFormValues,
  getMnemonicErrorFields,
  getMnemonicErrorMessage,
  hasMnemonicFormValues,
} from '@app/ui/components/secret-key/mnemonic-key/utils/error-handling';
import { mnemonicFormResolver } from '@app/ui/components/secret-key/mnemonic-key/utils/validation';
import { SecretKeyGrid } from '@app/ui/components/secret-key/secret-key-grid';

interface MnemonicFormProps {
  mnemonic: (string | null)[];
  setMnemonic(mnemonic: (string | null)[]): void;
  twentyFourWordMode: boolean;
  onSubmit(mnemonic: string): Promise<void>;
  error: string | undefined;
  isLoading: boolean;
}
export function MnemonicForm({
  mnemonic,
  setMnemonic,
  twentyFourWordMode,
  onSubmit,
  error,
  isLoading,
}: MnemonicFormProps) {
  function mnemonicWordUpdate(index: number, word: string) {
    const newMnemonic = [...mnemonic];
    newMnemonic[index] = word;
    setMnemonic(newMnemonic);
  }

  function updateEntireKey(key: string, setFieldValue: (name: string, value: string) => void) {
    const newKey = key.split(' ');
    newKey.forEach((word, index) => setFieldValue(`${index + 1}`, word));
    setMnemonic(newKey);
    void onSubmit(key);
  }

  function handleSubmit() {
    return onSubmit(mnemonic.join(' '));
  }

  const mnemonicFieldArray = mnemonic
    ? mnemonic
    : new Array<string | null>(twentyFourWordMode ? 24 : 12).fill(null);

  // set initialValues to avoid throwing uncontrolled inputs error
  const initialValues = mnemonicFieldArray.reduce<Record<string, string>>(
    (accumulator, _, index) => ((accumulator[`${index + 1}`] = ''), accumulator),
    {}
  );
  const methods = useForm<MnemonicFormValues>({
    defaultValues: initialValues,
    resolver: mnemonicFormResolver,
    mode: 'all',
  });
  const { errors, isValid, submitCount, touchedFields } = methods.formState;
  const values = methods.watch();
  const touched = submitCount > 0 ? mapValues(values, () => true) : touchedFields;
  const submitForm = useLatestCallback(handleSubmit);

  const hasFormValues = hasMnemonicFormValues(values);
  const mnemonicErrorFields = getMnemonicErrorFields(errors, touched, values);
  const showMnemonicErrors = !isEmpty(mnemonicErrorFields) && hasFormValues;
  const mnemonicErrorMessage = getMnemonicErrorMessage(mnemonicErrorFields);

  return (
    <FormProvider {...methods}>
      <form
        // this onSubmit is to appease Formik and is only really needed in the onClick()
        onSubmit={event => void methods.handleSubmit(submitForm)(event)}
      >
        <Stack gap="space.05">
          <SecretKeyGrid>
            {mnemonicFieldArray.map((_, i) => (
              <MnemonicWordInput
                fieldNumber={i + 1}
                key={i}
                value={mnemonic[i] || ''}
                onPasteEntireKey={key => {
                  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                  updateEntireKey(key, (name, value) =>
                    methods.setValue(name, value, { shouldValidate: true })
                  );
                }}
                onUpdateWord={w => mnemonicWordUpdate(i, w)}
              />
            ))}
          </SecretKeyGrid>
          {(showMnemonicErrors || error) && (
            <ErrorLabel data-testid={OnboardingSelectors.SignInSeedError}>
              {showMnemonicErrors ? mnemonicErrorMessage : error}
            </ErrorLabel>
          )}

          <Button
            data-testid={OnboardingSelectors.SignInBtn}
            aria-disabled={isLoading || showMnemonicErrors}
            disabled={isEmpty(touched) || !isValid || !hasFormValues}
            aria-busy={isLoading}
            fullWidth
            type="submit"
            variant="solid"
            onClick={e => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            Continue
          </Button>
        </Stack>
      </form>
    </FormProvider>
  );
}
