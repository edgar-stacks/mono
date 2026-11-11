import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { Form, Formik, type FormikHelpers } from 'formik';
import { Stack } from 'leather-styles/jsx';
import { debounce } from 'ts-debounce';
import { z } from 'zod';

import { Button } from '@leather.io/ui';
import { isUndefined } from '@leather.io/utils';

import { isPlatformAuthenticatorSupported } from '@shared/crypto/platform-authenticator';
import { requiredStringField } from '@shared/forms/field-schemas';
import { RouteUrls } from '@shared/route-urls';
import { analytics } from '@shared/utils/analytics';

import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { createFormikValidationSchema } from '@app/common/validation/formik-validation-schema';
import {
  blankPasswordValidation,
  validatePassword,
} from '@app/common/validation/validate-password';
import { Content } from '@app/components/layout';
import { Header } from '@app/components/layout/headers/header';
import { HeaderBackButton } from '@app/components/layout/headers/header-back-button';
import { HeaderGrid } from '@app/components/layout/headers/header-grid';
import {
  DescriptionColumn,
  TwoColumnLayout,
} from '@app/components/layout/layouts/two-column.layout';
import { RequestBiometricUnlock } from '@app/components/request-biometric-unlock';
import { useCheckPassword } from '@app/store/software-keys/software-key.hooks';
import {
  selectSoftwareKeys,
  useIsBiometricOnlyProfile,
} from '@app/store/software-keys/software-key.selectors';

import { BiometricSetup } from './components/biometric-setup';
import { PasswordField } from './components/password-field';

interface SetPasswordFormValues {
  password: string;
  confirmPassword: string;
}
const setPasswordFormValues: SetPasswordFormValues = { password: '', confirmPassword: '' };

interface SetPasswordPageProps {
  mnemonicData: { mnemonic: string; fingerprint: string };
  isRestore?: boolean;
  onBack?(): void;
}
export function SetPasswordPage({ mnemonicData, isRestore, onBack }: SetPasswordPageProps) {
  const [loading, setLoading] = useState(false);
  const [isBiometricBusy, setIsBiometricBusy] = useState(false);
  const [strengthResult, setStrengthResult] = useState(blankPasswordValidation);
  const { setPassword, createBiometricWallet, addWalletWithBiometrics } = useKeyActions();
  const softwareKeys = useSelector(selectSoftwareKeys);
  const hasSoftwareKeys = !!softwareKeys.length;
  const isBiometricOnly = useIsBiometricOnlyProfile();
  const [isBiometricSupported] = useState(isPlatformAuthenticatorSupported);
  const canChooseBiometrics = !hasSoftwareKeys && isBiometricSupported;
  const checkPassword = useCheckPassword();

  const navigate = useNavigate();

  const navigateHome = useCallback(() => {
    void navigate(RouteUrls.Home, { replace: true, state: { fromOnboarding: true } });
  }, [navigate]);

  const enrollBiometrics = useCallback(async () => {
    await createBiometricWallet({
      mnemonic: mnemonicData.mnemonic,
      fingerprint: mnemonicData.fingerprint,
    });
    navigateHome();
  }, [createBiometricWallet, navigateHome, mnemonicData.fingerprint, mnemonicData.mnemonic]);

  const addWalletWithBiometricConfirmation = useCallback(async () => {
    await addWalletWithBiometrics({
      mnemonic: mnemonicData.mnemonic,
      fingerprint: mnemonicData.fingerprint,
    });
  }, [addWalletWithBiometrics, mnemonicData.fingerprint, mnemonicData.mnemonic]);

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
  if (hasSoftwareKeys && isBiometricOnly) {
    return (
      <>
        <Header px="space.04">
          <HeaderGrid leftCol={<HeaderBackButton onBack={onBack} />} rightCol={null} />
        </Header>
        <Content>
          <RequestBiometricUnlock
            title="Confirm it's you"
            description="Use your configured unlock method to continue."
            authenticate={addWalletWithBiometricConfirmation}
            onSuccess={navigateHome}
          />
        </Content>
      </>
    );
  }

  function getTitle() {
    if (hasSoftwareKeys) return 'Enter your Password';
    return canChooseBiometrics ? 'Choose how to unlock Leather' : 'Set a password';
  }

  function getDescription() {
    if (hasSoftwareKeys) return 'Enter the password you set on this device.';
    return canChooseBiometrics
      ? 'Choose a password or biometrics. Your choice applies to every software wallet in this browser profile.'
      : "Your password protects your Secret Key on this device only. To access your wallet on another device, you'll need just your Secret Key.";
  }
  const title = getTitle();
  const description = getDescription();

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
                      isDisabled={loading || isBiometricBusy}
                      showStrength={!hasSoftwareKeys}
                    />
                    <Button
                      data-testid={OnboardingSelectors.SetPasswordBtn}
                      disabled={loading || isBiometricBusy || !(dirty && isValid)}
                      aria-busy={loading || isSubmitting}
                      mt="space.05"
                      type="submit"
                    >
                      Continue
                    </Button>
                    {canChooseBiometrics && (
                      <BiometricSetup
                        label={isRestore ? 'Use biometrics instead' : 'Use biometrics'}
                        isDisabled={loading}
                        onBusyChange={setIsBiometricBusy}
                        onEnroll={enrollBiometrics}
                      />
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
