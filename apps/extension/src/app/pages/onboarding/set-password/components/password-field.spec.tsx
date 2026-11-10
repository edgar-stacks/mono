import { FormProvider, useForm } from 'react-hook-form';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { describe, expect, test, vi } from 'vitest';

import { blankPasswordValidation } from '@app/common/validation/validate-password';

import { PasswordField } from './password-field';

const passwordMismatchError = "The password you entered doesn't match";

vi.mock('leather-styles/jsx', () => ({
  Box({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  },
  Flex({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  },
  styled: {
    button({ children, onClick }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
      return (
        <button type="button" onClick={onClick}>
          {children}
        </button>
      );
    },
  },
}));

vi.mock('@leather.io/ui', () => ({
  Caption({ children }: { children: React.ReactNode }) {
    return <span>{children}</span>;
  },
  Eye1ClosedIcon() {
    return null;
  },
  Eye1Icon() {
    return null;
  },
  Input: {
    Root({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    },
    Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
      return <input {...props} />;
    },
    Label({ children }: { children: React.ReactNode }) {
      return <label>{children}</label>;
    },
  },
}));

vi.mock('@app/common/theme-provider', () => ({
  useThemeSwitcher() {
    return { theme: 'light' };
  },
}));

vi.mock('@app/components/error-label', () => ({
  ErrorLabel({ children }: { children: React.ReactNode }) {
    return <span data-testid="password-error">{children}</span>;
  },
}));

function EnterPasswordForm() {
  const methods = useForm<{ password: string }>({
    defaultValues: { password: '' },
    mode: 'all',
  });
  return (
    <FormProvider {...methods}>
      <form
        data-testid="password-form"
        onSubmit={event =>
          void methods.handleSubmit(() =>
            methods.setError('password', { message: passwordMismatchError })
          )(event)
        }
      >
        <PasswordField
          strengthResult={blankPasswordValidation}
          isDisabled={false}
          showStrength={false}
        />
      </form>
    </FormProvider>
  );
}

describe(PasswordField.name, () => {
  test('shows the error set by a submit made before the field loses focus', async () => {
    render(<EnterPasswordForm />);

    const input = screen.getByTestId(OnboardingSelectors.NewPasswordInput);
    fireEvent.change(input, { target: { value: 'wrong password' } });
    expect(screen.queryByTestId('password-error')).toBeNull();

    fireEvent.submit(screen.getByTestId('password-form'));

    await waitFor(() =>
      expect(screen.getByTestId('password-error').textContent).toEqual(passwordMismatchError)
    );
  });
});
