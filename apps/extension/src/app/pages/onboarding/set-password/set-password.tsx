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

import { getBiometricUnlockFailureCategory } from '@shared/crypto/platform-authenticator';
import { requiredStringField } from '@shared/forms/field-schemas';
import { RouteUrls } from '@shared/route-urls';
import { analytics } from '@shared/utils/analytics';

import {
  biometricUnavailableMessage,
  getBiometricEnrollmentErrorMessage,
} from '@app/common/biometric-unlock/biometric-unlock-messages';
import { usePlatformUnlockAvailability } from '@app/common/biometric-unlock/use-platform-unlock-availability';
import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { createFormikValidationSchema } from '@app/common/validation/formik-validation-schema';
import {
  blankPasswordValidation,
  validatePassword,
} from '@app/common/validation/validate-password';
import { BiometricConfirmation } from '@app/components/biometric-confirmation';
import { ErrorLabel } from '@app/components/error-label';
import { Content } from '@app/components/layout';
import { Header } from '@app/components/layout/headers/header';
import { HeaderBackButton } from '@app/components/layout/headers/header-back-button';
import { HeaderGrid } from '@app/components/layout/headers/header-grid';
import {
  DescriptionColumn,
  TwoColumnLayout,
} from '@app/components/layout/layouts/two-column.layout';
import { useCheckPassword } from '@app/store/software-keys/software-key.hooks';
import {
  selectSoftwareKeys,
  useIsBiometricOnlyProfile,
} from '@app/store/software-keys/software-key.selectors';

import { PasswordField } from './components/password-field';

interface SetPasswordFormValues {
  password: string;
  confirmPassword: string;
}
const setPasswordFormValues: SetPasswordFormValues = { password: '', confirmPassword: '' };

const unlockChoiceTitle = 'Choose how to unlock Leather';
const unlockChoiceDescription =
  'Choose a password or biometrics. Your choice applies to every software wallet in this browser profile.';

interface SetPasswordPageProps {
  mnemonicData: { mnemonic: string; fingerprint: string };
  isRestore?: boolean;
  onBack?(): void;
}
export function SetPasswordPage(props: SetPasswordPageProps) {
  const hasSoftwareKeys = useSelector(selectSoftwareKeys).length > 0;
  const isBiometricOnly = useIsBiometricOnlyProfile();

  if (hasSoftwareKeys && isBiometricOnly) return <ConfirmBiometricAddWallet {...props} />;

  return <ChooseUnlockMethod {...props} />;
}

function ConfirmBiometricAddWallet({ mnemonicData, onBack }: SetPasswordPageProps) {
  const { addWalletWithBiometrics } = useKeyActions();
  const navigate = useNavigate();

  const confirm = useCallback(
    () =>
      addWalletWithBiometrics({
        mnemonic: mnemonicData.mnemonic,
        fingerprint: mnemonicData.fingerprint,
      }),
    [addWalletWithBiometrics, mnemonicData.fingerprint, mnemonicData.mnemonic]
  );

  const onSuccess = useCallback(() => {
    void navigate(RouteUrls.Home, { replace: true, state: { fromOnboarding: true } });
  }, [navigate]);

  return (
    <>
      <Header px="space.04">
        <HeaderGrid leftCol={<HeaderBackButton onBack={onBack} />} rightCol={null} />
      </Header>
      <Content>
        <TwoColumnLayout
          leftColumn={
            <DescriptionColumn
              title="Confirm it's you"
              description="Use biometrics to add this wallet to Leather."
            />
          }
          rightColumn={
            <Stack
              p="space.05"
              bg="ink.background-primary"
              border="default"
              borderRadius="lg"
              width="100%"
              minWidth={['100%', null, '400px', 'twoColumnPageWidth']}
              flex="1"
            >
              <BiometricConfirmation
                caption="Use your configured unlock method to continue."
                confirm={confirm}
                onSuccess={onSuccess}
              />
            </Stack>
          }
        />
      </Content>
    </>
  );
}

function ChooseUnlockMethod({ mnemonicData, isRestore = false, onBack }: SetPasswordPageProps) {
  const [loading, setLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [strengthResult, setStrengthResult] = useState(blankPasswordValidation);
  const { setPassword, createBiometricWallet } = useKeyActions();
  const softwareKeys = useSelector(selectSoftwareKeys);
  const hasSoftwareKeys = !!softwareKeys.length;
  const checkPassword = useCheckPassword();
  const { availability, isOffered } = usePlatformUnlockAvailability();
  const showUnlockChoice = !hasSoftwareKeys && isOffered;

  const navigate = useNavigate();

  const submit = useCallback(
    async (password: string) => {
      await setPassword({
        password,
        mnemonic: mnemonicData.mnemonic,
        fingerprint: mnemonicData.fingerprint,
      });
      void navigate(RouteUrls.Home, { replace: true, state: { fromOnboarding: true } });
    },
    [setPassword, navigate, mnemonicData.fingerprint, mnemonicData.mnemonic]
  );

  const enrollBiometrics = useCallback(async () => {
    setLoading(true);
    setBiometricError('');
    try {
      await createBiometricWallet({
        mnemonic: mnemonicData.mnemonic,
        fingerprint: mnemonicData.fingerprint,
      });
      void navigate(RouteUrls.Home, { replace: true, state: { fromOnboarding: true } });
    } catch (error) {
      setBiometricError(
        getBiometricEnrollmentErrorMessage(getBiometricUnlockFailureCategory(error))
      );
    } finally {
      setLoading(false);
    }
  }, [createBiometricWallet, navigate, mnemonicData.fingerprint, mnemonicData.mnemonic]);

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
  const passwordTitle = hasSoftwareKeys ? 'Enter your Password' : 'Set a password';
  const passwordDescription = hasSoftwareKeys
    ? 'Enter the password you set on this device.'
    : "Your password protects your Secret Key on this device only. To access your wallet on another device, you'll need just your Secret Key.";
  const title = showUnlockChoice ? unlockChoiceTitle : passwordTitle;
  const description = showUnlockChoice ? unlockChoiceDescription : passwordDescription;

  return (
    <>
      <Header px="space.04">
        <HeaderGrid leftCol={<HeaderBackButton onBack={onBack} />} rightCol={null} />
      </Header>
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
                    {showUnlockChoice && (
                      <>
                        <styled.p textAlign="center" textStyle="label.02" color="ink.text-subdued">
                          or
                        </styled.p>
                        <Button
                          data-testid={OnboardingSelectors.BiometricSetupBtn}
                          disabled={loading || availability !== 'available'}
                          aria-busy={loading}
                          onClick={() => void enrollBiometrics()}
                          type="button"
                          variant="outline"
                        >
                          {isRestore ? 'Use biometrics instead' : 'Use biometrics'}
                        </Button>
                        {availability === 'unavailable' && (
                          <styled.p textStyle="caption.01" color="ink.text-subdued">
                            {biometricUnavailableMessage}
                          </styled.p>
                        )}
                        {biometricError && (
                          <ErrorLabel data-testid={OnboardingSelectors.BiometricSetupError}>
                            {biometricError}
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
