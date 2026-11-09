import { useEffect, useState } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';
import { describe, expect, it, vi } from 'vitest';

import { MnemonicForm } from './mnemonic-form';

const testVectorWords = [
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'abandon',
  'about',
];

interface MnemonicFormHarnessProps {
  onSubmit(mnemonic: string): Promise<void>;
}
function MnemonicFormHarness({ onSubmit }: MnemonicFormHarnessProps) {
  const [mnemonic, setMnemonic] = useState<(string | null)[]>([]);

  useEffect(() => setMnemonic(new Array<string | null>(24).fill(null)), []);

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

function isContinueDisabled() {
  return screen.getByTestId(OnboardingSelectors.SignInBtn).hasAttribute('disabled');
}

function enterWord(fieldNumber: number, word: string) {
  const input = screen.getByTestId(`mnemonic-input-${fieldNumber}`);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: word } });
  fireEvent.blur(input);
}

describe(MnemonicForm.name, () => {
  it('keeps Continue disabled before anything is typed', () => {
    render(<MnemonicFormHarness onSubmit={vi.fn()} />);
    expect(isContinueDisabled()).toBe(true);
  });

  it('enables Continue after twelve valid words in the 24 word grid and submits them', async () => {
    const onSubmit = vi.fn<(mnemonic: string) => Promise<void>>(() => Promise.resolve());
    render(<MnemonicFormHarness onSubmit={onSubmit} />);

    testVectorWords.forEach((word, index) => enterWord(index + 1, word));

    await waitFor(() => expect(isContinueDisabled()).toBe(false));

    fireEvent.click(screen.getByTestId(OnboardingSelectors.SignInBtn));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]?.trim()).toEqual(testVectorWords.join(' '));
  });

  it('disables Continue again and shows an error for a word outside the word list', async () => {
    render(<MnemonicFormHarness onSubmit={vi.fn()} />);

    testVectorWords.forEach((word, index) => enterWord(index + 1, word));
    await waitFor(() => expect(isContinueDisabled()).toBe(false));

    enterWord(3, 'notaword');

    await waitFor(() =>
      expect(
        screen.getByTestId(OnboardingSelectors.SignInSeedError).textContent?.replace(/\s+/g, ' ')
      ).toEqual('Word 3 is incorrect or misspelled')
    );
    expect(isContinueDisabled()).toBe(true);
  });
});
