import { useEffect, useState } from 'react';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { MnemonicForm } from './mnemonic-form';

vi.mock('leather-styles/jsx', () => ({
  Grid({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  },
  Stack({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  },
}));

vi.mock('@leather.io/ui', () => ({
  Button({ children, ...props }: React.ComponentProps<'button'>) {
    return <button {...props}>{children}</button>;
  },
  ErrorCircleIcon: () => null,
  Flag({ children, ...props }: { children: React.ReactNode; 'data-testid'?: string }) {
    return <div data-testid={props['data-testid']}>{children}</div>;
  },
  Input: {
    Root({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    },
    Field(props: React.ComponentProps<'input'>) {
      return <input {...props} />;
    },
    Label({ children }: { children: React.ReactNode }) {
      return <label>{children}</label>;
    },
  },
}));

const testVectorWords =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'.split(
    ' '
  );

interface MnemonicFormHarnessProps {
  onSubmit(mnemonic: string): Promise<void>;
}
function MnemonicFormHarness({ onSubmit }: MnemonicFormHarnessProps) {
  const [mnemonic, setMnemonic] = useState<(string | null)[]>([]);

  useEffect(() => {
    setMnemonic(new Array<string | null>(24).fill(null));
  }, []);

  return (
    <MnemonicForm
      mnemonic={mnemonic}
      setMnemonic={setMnemonic}
      twentyFourWordMode
      onSubmit={onSubmit}
      error={undefined}
      isLoading={false}
    />
  );
}

function getContinueButton() {
  return screen.getByTestId(OnboardingSelectors.SignInBtn);
}

function isContinueDisabled() {
  return getContinueButton().hasAttribute('disabled');
}

function typeWord(fieldNumber: number, word: string) {
  const input = screen.getByTestId(`mnemonic-input-${fieldNumber}`);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: word } });
  fireEvent.blur(input);
}

describe(MnemonicForm.name, () => {
  afterEach(() => cleanup());

  test('Continue is disabled before typing', () => {
    render(<MnemonicFormHarness onSubmit={vi.fn()} />);

    expect(isContinueDisabled()).toBe(true);
  });

  test('Continue enables after twelve valid words in the 24-word grid and submits them', async () => {
    const onSubmit = vi.fn<(mnemonic: string) => Promise<void>>().mockResolvedValue(undefined);
    render(<MnemonicFormHarness onSubmit={onSubmit} />);

    await waitFor(() => expect(screen.getByTestId('mnemonic-input-24')).toBeTruthy());
    testVectorWords.forEach((word, index) => typeWord(index + 1, word));

    await waitFor(() => expect(isContinueDisabled()).toBe(false));

    fireEvent.click(getContinueButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].trim()).toBe(testVectorWords.join(' '));
  });

  test('Continue disables again with an error for a word outside the list', async () => {
    render(<MnemonicFormHarness onSubmit={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId('mnemonic-input-24')).toBeTruthy());
    testVectorWords.forEach((word, index) => typeWord(index + 1, word));
    await waitFor(() => expect(isContinueDisabled()).toBe(false));

    typeWord(3, 'notaword');

    await waitFor(() =>
      expect(
        screen.getByTestId(OnboardingSelectors.SignInSeedError).textContent?.replace(/\s+/g, ' ')
      ).toBe('Word 3 is incorrect or misspelled')
    );
    expect(isContinueDisabled()).toBe(true);
  });
});
