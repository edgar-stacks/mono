import { useMemo, useState } from 'react';
import { useController, useFormState } from 'react-hook-form';

import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { Box, Flex, styled } from 'leather-styles/jsx';

import { Caption, Eye1ClosedIcon, Eye1Icon, Input } from '@leather.io/ui';

import { useFieldError } from '@app/common/form-utils';
import { useThemeSwitcher } from '@app/common/theme-provider';
import { type ValidatedPassword } from '@app/common/validation/validate-password';
import { ErrorLabel } from '@app/components/error-label';

import { getIndicatorsOfPasswordStrength } from './password-field.utils';
import { PasswordStrengthIndicator } from './password-strength-indicator';

interface PasswordFieldFormValues {
  password: string;
}

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
  const { field, fieldState } = useController<PasswordFieldFormValues, 'password'>({
    name: 'password',
  });
  const { submitCount } = useFormState<PasswordFieldFormValues>({ name: 'password' });
  const error = useFieldError('password');
  const isTouched = fieldState.isTouched || submitCount > 0;
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useThemeSwitcher();

  const { strengthColorLightMode, strengthColorDarkMode, strengthText } = useMemo(
    () => getIndicatorsOfPasswordStrength(strengthResult),
    [strengthResult]
  );

  return (
    <>
      <Box position="relative">
        <Input.Root hasError={!showStrength && isTouched && !!error}>
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
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
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
            password={field.value}
            strengthColor={theme === 'light' ? strengthColorLightMode : strengthColorDarkMode}
            strengthResult={strengthResult}
          />
          <Flex alignItems="center">
            <Caption mr="space.02">Password strength:</Caption>
            <Caption>{field.value ? strengthText : '—'}</Caption>
          </Flex>
        </>
      ) : (
        isTouched && error && <ErrorLabel>{error}</ErrorLabel>
      )}
    </>
  );
}
