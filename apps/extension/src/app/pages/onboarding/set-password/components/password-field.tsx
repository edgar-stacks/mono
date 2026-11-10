import { useMemo, useState } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';

import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { Box, Flex, styled } from 'leather-styles/jsx';

import { Caption, Eye1ClosedIcon, Eye1Icon, Input } from '@leather.io/ui';

import { useFieldError } from '@app/common/form-utils';
import { useThemeSwitcher } from '@app/common/theme-provider';
import { type ValidatedPassword } from '@app/common/validation/validate-password';
import { ErrorLabel } from '@app/components/error-label';

import { getIndicatorsOfPasswordStrength } from './password-field.utils';
import { PasswordStrengthIndicator } from './password-strength-indicator';

interface PasswordFieldProps {
  strengthResult: ValidatedPassword;
  isDisabled: boolean;
  showStrength?: boolean;
}
export function PasswordField({
  strengthResult,
  isDisabled,
  showStrength = true,
}: PasswordFieldProps) {
  const { control, register } = useFormContext<{ password: string }>();
  const password = useWatch({ control, name: 'password' });
  const { submitCount, touchedFields } = useFormState({ control, name: 'password' });
  const error = useFieldError('password');
  const showError = (submitCount > 0 || !!touchedFields.password) && !!error;
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useThemeSwitcher();

  const { strengthColorLightMode, strengthColorDarkMode, strengthText } = useMemo(
    () => getIndicatorsOfPasswordStrength(strengthResult),
    [strengthResult]
  );

  return (
    <>
      <Box position="relative">
        <Input.Root hasError={!showStrength && showError}>
          <Input.Label>Password</Input.Label>
          <Input.Field
            autoCapitalize="off"
            autoComplete="off"
            autoFocus
            data-testid={OnboardingSelectors.NewPasswordInput}
            disabled={isDisabled}
            key="password-input"
            type={showPassword ? 'text' : 'password'}
            width="100%"
            {...register('password')}
          />
        </Input.Root>
        <styled.button
          _focus={{ bg: 'transparent', outline: 'none' }}
          _hover={{ bg: 'transparent', outline: 'none' }}
          bg="transparent"
          appearance="none"
          height="20px"
          onClick={() => setShowPassword(!showPassword)}
          position="absolute"
          right="space.04"
          top="22px"
          type="button"
          width="20px"
          zIndex={10}
        >
          {showPassword ? <Eye1ClosedIcon /> : <Eye1Icon />}
        </styled.button>
      </Box>
      {showStrength ? (
        <>
          <PasswordStrengthIndicator
            password={password}
            strengthColor={theme === 'light' ? strengthColorLightMode : strengthColorDarkMode}
            strengthResult={strengthResult}
          />
          <Flex alignItems="center">
            <Caption mr="space.02">Password strength:</Caption>
            <Caption>{password ? strengthText : '—'}</Caption>
          </Flex>
        </>
      ) : (
        showError && <ErrorLabel>{error}</ErrorLabel>
      )}
    </>
  );
}
