import { useState } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OnboardingSelectors } from '@tests/selectors/onboarding.selectors';

import { createNullArrayOfLength } from '@leather.io/utils';

import { MnemonicForm } from './mnemonic-form';

const testVectorMnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

interface MnemonicFormHarnessProps {
  onSubmit(mnemonic: string): Promise<void>;
}
function MnemonicFormHarness({ onSubmit }: MnemonicFormHarnessProps) {
  const [mnemonic, setMnemonic] = useState<(string | null)[]>(createNullArrayOfLength(24));
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

function typeWord(fieldNumber: number, word: string) {
  const input = screen.getByTestId(`mnemonic-input-${fieldNumber}`);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: word } });
  fireEvent.blur(input);
}

function getContinueButton() {
  return screen.getByTestId(OnboardingSelectors.SignInBtn);
}

function isContinueDisabled() {
  return getContinueButton().hasAttribute('disabled');
}

describe(MnemonicForm.name, () => {
  it('keeps Continue disabled before any word is typed', () => {
    render(<MnemonicFormHarness onSubmit={vi.fn(() => Promise.resolve())} />);
    expect(isContinueDisabled()).toBe(true);
  });

  it('enables Continue once twelve valid words are typed in the 24-word grid and submits them', async () => {
    const onSubmit = vi.fn<(mnemonic: string) => Promise<void>>(() => Promise.resolve());
    render(<MnemonicFormHarness onSubmit={onSubmit} />);

    testVectorMnemonic.split(' ').forEach((word, index) => typeWord(index + 1, word));

    await waitFor(() => expect(isContinueDisabled()).toBe(false));
    fireEvent.click(getContinueButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].trim()).toEqual(testVectorMnemonic);
  });

  it('disables Continue and names the word that is not in the word list', async () => {
    render(<MnemonicFormHarness onSubmit={vi.fn(() => Promise.resolve())} />);

    testVectorMnemonic.split(' ').forEach((word, index) => typeWord(index + 1, word));
    await waitFor(() => expect(isContinueDisabled()).toBe(false));

    typeWord(3, 'notaword');

    await waitFor(() => expect(isContinueDisabled()).toBe(true));
    const errorText = screen.getByTestId(OnboardingSelectors.SignInSeedError).textContent ?? '';
    expect(errorText.replace(/\s+/g, ' ')).toEqual('Word 3 is incorrect or misspelled');
  });
});
