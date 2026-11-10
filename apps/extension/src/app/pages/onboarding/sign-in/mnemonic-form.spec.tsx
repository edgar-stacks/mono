import { useEffect, useState } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { MnemonicForm } from './mnemonic-form';

const testVectorWords =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'.split(
    ' '
  );

const mocks = vi.hoisted(() => ({
  onSubmit: vi.fn<(mnemonic: string) => Promise<void>>(),
}));

interface MockButtonProps {
  children: React.ReactNode;
  'data-testid': string;
  disabled: boolean;
  onClick(event: React.MouseEvent<HTMLButtonElement>): void;
}

vi.mock('leather-styles/jsx', () => ({
  Stack({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  },
}));

vi.mock('@leather.io/ui', () => ({
  Button({ children, 'data-testid': testId, disabled, onClick }: MockButtonProps) {
    return (
      <button data-testid={testId} disabled={disabled} onClick={onClick}>
        {children}
      </button>
    );
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

vi.mock('@app/components/error-label', () => ({
  ErrorLabel({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
    return <span {...props}>{children}</span>;
  },
}));

vi.mock('@app/ui/components/secret-key/secret-key-grid', () => ({
  SecretKeyGrid({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  },
}));

function TwentyFourWordMnemonicForm() {
  const [mnemonic, setMnemonic] = useState<(string | null)[]>([]);

  useEffect(() => setMnemonic(new Array<string | null>(24).fill(null)), []);

  return (
    <MnemonicForm
      mnemonic={mnemonic}
      setMnemonic={setMnemonic}
      twentyFourWordMode
      onSubmit={mocks.onSubmit}
      error={undefined}
      isLoading={false}
    />
  );
}

function getContinueButton() {
  return screen.getByTestId(OnboardingSelectors.SignInBtn);
}

function enterWord(fieldNumber: number, word: string) {
  const input = screen.getByTestId(`mnemonic-input-${fieldNumber}`);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: word } });
  fireEvent.blur(input);
}

describe(MnemonicForm.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onSubmit.mockResolvedValue(undefined);
  });

  test('enables Continue once twelve valid words are entered and submits them', async () => {
    render(<TwentyFourWordMnemonicForm />);

    await screen.findByTestId('mnemonic-input-24');
    expect(getContinueButton()).toHaveProperty('disabled', true);

    testVectorWords.forEach((word, index) => enterWord(index + 1, word));

    await waitFor(() => expect(getContinueButton()).toHaveProperty('disabled', false));

    fireEvent.click(getContinueButton());

    expect(mocks.onSubmit).toHaveBeenCalledTimes(1);
    const [submittedMnemonic] = mocks.onSubmit.mock.calls[0];
    expect(submittedMnemonic.trim()).toEqual(testVectorWords.join(' '));
  });

  test('disables Continue and names the word that is not in the word list', async () => {
    render(<TwentyFourWordMnemonicForm />);

    await screen.findByTestId('mnemonic-input-24');
    testVectorWords.forEach((word, index) => enterWord(index + 1, word));
    await waitFor(() => expect(getContinueButton()).toHaveProperty('disabled', false));

    enterWord(3, 'notaword');

    await waitFor(() => expect(getContinueButton()).toHaveProperty('disabled', true));
    expect(screen.getByTestId(OnboardingSelectors.SignInSeedError).textContent).toEqual(
      'Word  3 is incorrect or misspelled'
    );
    expect(screen.getByText('Word 3 is incorrect or misspelled')).toBeDefined();
  });

  test('names a misspelled word when the form is submitted before the word loses focus', async () => {
    render(<TwentyFourWordMnemonicForm />);

    await screen.findByTestId('mnemonic-input-24');
    testVectorWords.forEach((word, index) => {
      if (index !== 2) enterWord(index + 1, word);
    });
    const input = screen.getByTestId('mnemonic-input-3');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'notaword' } });
    const form = input.closest('form');
    if (!form) throw new Error('Mnemonic form not rendered');
    fireEvent.submit(form);

    await waitFor(() =>
      expect(screen.getByTestId(OnboardingSelectors.SignInSeedError).textContent).toEqual(
        'Word  3 is incorrect or misspelled'
      )
    );
    expect(mocks.onSubmit).not.toHaveBeenCalled();
  });
});
