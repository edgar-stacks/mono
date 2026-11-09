import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { Form, Formik, type FormikHelpers } from 'formik';
import { Stack, styled } from 'leather-styles/jsx';
import { debounce } from 'ts-debounce';
import { z } from 'zod';

import { Button } from '@leather.io/ui';
import { isUndefined } from '@leather.io/utils';

import { getBiometricUnlockFailureCategory } from '@shared/biometric-unlock/biometric-unlock-error';
import { isPlatformUnlockBrowser } from '@shared/biometric-unlock/platform-authenticator';
import { requiredStringField } from '@shared/forms/field-schemas';
import { RouteUrls } from '@shared/route-urls';
import { analytics } from '@shared/utils/analytics';

import { useBiometricUnlockAvailability } from '@app/common/hooks/use-biometric-unlock';
import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { createFormikValidationSchema } from '@app/common/validation/formik-validation-schema';
import {
  blankPasswordValidation,
  validatePassword,
} from '@app/common/validation/validate-password';
import { ErrorLabel } from '@app/components/error-label';
import { Content } from '@app/components/layout';
import { Header } from '@app/components/layout/headers/header';
import { HeaderBackButton } from '@app/components/layout/headers/header-back-button';
import { HeaderGrid } from '@app/components/layout/headers/header-grid';
import {
  DescriptionColumn,
  TwoColumnLayout,
} from '@app/components/layout/layouts/two-column.layout';
import { BiometricUnlockPrompt } from '@app/features/wallet-authentication/biometric-unlock-prompt';
import { useCheckPassword } from '@app/store/software-keys/software-key.hooks';
import {
  selectSoftwareKeys,
  useSoftwareKeyAuthenticationMode,
} from '@app/store/software-keys/software-key.selectors';

import { PasswordField } from './components/password-field';

interface SetPasswordFormValues {
  password: string;
  confirmPassword: string;
}
const setPasswordFormValues: SetPasswordFormValues = { password: '', confirmPassword: '' };

const biometricUnavailableMessage = "Biometric unlock isn't available in this browser context.";
const biometricSetupFailedMessage =
  'Biometric unlock could not be set up. Try again or continue with a password.';
const biometricNoPrfMessage =
  "The passkey provider you chose can't be used to unlock Leather. Try again and save the passkey on this device, or continue with a password.";

interface SetPasswordPageProps {
  mnemonicData: { mnemonic: string; fingerprint: string };
  isRestore?: boolean;
  onBack?(): void;
}
export function SetPasswordPage({ mnemonicData, isRestore = false, onBack }: SetPasswordPageProps) {
  const [loading, setLoading] = useState(false);
  const [biometricSetupError, setBiometricSetupError] = useState<string | null>(null);
  const [strengthResult, setStrengthResult] = useState(blankPasswordValidation);
  const { setPassword, createBiometricWallet, addWalletWithBiometrics } = useKeyActions();
  const softwareKeys = useSelector(selectSoftwareKeys);
  const hasSoftwareKeys = !!softwareKeys.length;
  const authenticationMode = useSoftwareKeyAuthenticationMode();
  const biometricAvailability = useBiometricUnlockAvailability();
  const canChooseBiometrics = !hasSoftwareKeys && isPlatformUnlockBrowser();
  const checkPassword = useCheckPassword();

  const navigate = useNavigate();

  const navigateHome = useCallback(
    () => void navigate(RouteUrls.Home, { replace: true, state: { fromOnboarding: true } }),
    [navigate]
  );

  async function setUpBiometrics() {
    setLoading(true);
    setBiometricSetupError(null);
    analytics.track('biometric_unlock_enrollment_started');
    try {
      await createBiometricWallet(mnemonicData);
      analytics.track('biometric_unlock_enrollment_completed');
      navigateHome();
    } catch (error) {
      const category = getBiometricUnlockFailureCategory(error);
      analytics.track('biometric_unlock_enrollment_failed', { category });
      setBiometricSetupError(
        category === 'no-prf' ? biometricNoPrfMessage : biometricSetupFailedMessage
      );
      setLoading(false);
    }
  }

  const submit = useCallback(
    async (password: string) => {
      await setPassword({
        password,
        mnemonic: mnemonicData.mnemonic,
        fingerprint: mnemonicData.fingerprint,
      });
      navigateHome();
    },
    [setPassword, navigateHome, mnemonicData.fingerprint, mnemonicData.mnemonic]
  );

  const onSubmit = useCallback(
    async (
      { password }: SetPasswordFormValues,
      { setFieldError }: FormikHelpers<SetPasswordFormValues>
    ) => {
      if (!password) return;
      setLoading(true);
      try {
        if (hasSoftwareKeys) {
          if (await checkPassword({ password })) {
            await submit(password);
            return;
          }
          setFieldError('password', "The password you entered doesn't match");
          return;
        }

        if (strengthResult.meetsAllStrengthRequirements) {
          analytics.track('submit_valid_password');
          await submit(password);
        }
      } catch {
        setFieldError('password', 'Something went wrong setting your password');
      } finally {
        setLoading(false);
      }
    },
    [hasSoftwareKeys, checkPassword, strengthResult, submit]
  );

  const validationSchema = createFormikValidationSchema(
    z.object({
      password: hasSoftwareKeys
        ? requiredStringField('Enter your password')
        : requiredStringField('password is a required field').check(
            z.refine<string>(
              debounce<
                [value: unknown, ...rest: unknown[]],
                (value: unknown, ...rest: unknown[]) => boolean
              >((value: unknown) => {
                if (isUndefined(value)) {
                  setStrengthResult(blankPasswordValidation);
                  return false;
                }
                if (typeof value !== 'string') return false;
                const result = validatePassword(value);
                setStrengthResult(result);
                if (!result.meetsAllStrengthRequirements) {
                  analytics.track('submit_invalid_password');
                }
                return result.meetsAllStrengthRequirements;
              }, 60),
              { error: 'Weak' }
            )
          ),
    })
  );
  const title = getSetPasswordTitle({ hasSoftwareKeys, canChooseBiometrics });
  const description = getSetPasswordDescription({ hasSoftwareKeys, canChooseBiometrics });

  const header = (
    <Header px="space.04">
      <HeaderGrid leftCol={<HeaderBackButton onBack={onBack} />} rightCol={null} />
    </Header>
  );

  if (hasSoftwareKeys && authenticationMode === 'biometric-only') {
    return (
      <>
        {header}
        <Content>
          <BiometricUnlockPrompt
            context="add-wallet"
            title="Confirm it's you"
            caption="Use your configured unlock method to continue."
            authenticate={async () => {
              await addWalletWithBiometrics(mnemonicData);
            }}
            onSuccess={navigateHome}
          />
        </Content>
      </>
    );
  }

  return (
    <>
      {header}
      <Content>
        <Formik
          initialValues={setPasswordFormValues}
          onSubmit={onSubmit}
          validationSchema={validationSchema}
          validateOnBlur
          validateOnMount
          validateOnChange
        >
          {({ dirty, isSubmitting, isValid }) => (
            <Form>
              <TwoColumnLayout
                leftColumn={<DescriptionColumn title={title} description={description} />}
                rightColumn={
                  <Stack
                    p="space.05"
                    gap="space.04"
                    bg="ink.background-primary"
                    border="default"
                    borderRadius="lg"
                    width="100%"
                    minWidth={['100%', null, '400px', 'twoColumnPageWidth']}
                    flex="1"
                  >
                    <PasswordField
                      strengthResult={strengthResult}
                      isDisabled={loading}
                      showStrength={!hasSoftwareKeys}
                    />
                    <Button
                      data-testid={OnboardingSelectors.SetPasswordBtn}
                      disabled={loading || !(dirty && isValid)}
                      aria-busy={loading || isSubmitting}
                      mt="space.05"
                      type="submit"
                    >
                      Continue
                    </Button>
                    {canChooseBiometrics && (
                      <>
                        <styled.p textAlign="center" textStyle="label.02" color="ink.text-subdued">
                          or
                        </styled.p>
                        <Button
                          data-testid={OnboardingSelectors.BiometricSetupBtn}
                          disabled={loading || biometricAvailability !== 'available'}
                          aria-busy={loading}
                          onClick={() => void setUpBiometrics()}
                          type="button"
                          variant="outline"
                        >
                          {isRestore ? 'Use biometrics instead' : 'Use biometrics'}
                        </Button>
                        {biometricAvailability === 'unavailable' && (
                          <styled.p textStyle="caption.01" color="ink.text-subdued">
                            {biometricUnavailableMessage}
                          </styled.p>
                        )}
                        {biometricSetupError && (
                          <ErrorLabel data-testid={OnboardingSelectors.BiometricSetupError}>
                            {biometricSetupError}
                          </ErrorLabel>
                        )}
                      </>
                    )}
                  </Stack>
                }
              />
            </Form>
          )}
        </Formik>
      </Content>
    </>
  );
}

interface SetPasswordCopyArgs {
  hasSoftwareKeys: boolean;
  canChooseBiometrics: boolean;
}

function getSetPasswordTitle({ hasSoftwareKeys, canChooseBiometrics }: SetPasswordCopyArgs) {
  if (hasSoftwareKeys) return 'Enter your Password';
  return canChooseBiometrics ? 'Choose how to unlock Leather' : 'Set a password';
}

function getSetPasswordDescription({ hasSoftwareKeys, canChooseBiometrics }: SetPasswordCopyArgs) {
  if (hasSoftwareKeys) return 'Enter the password you set on this device.';
  return canChooseBiometrics
    ? 'Choose a password or biometrics. Your choice applies to every software wallet in this browser profile.'
    : "Your password protects your Secret Key on this device only. To access your wallet on another device, you'll need just your Secret Key.";
}
