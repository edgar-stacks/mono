import { isCurrentWindowActionPopup } from './action-popup-classifier';
import {
  claimBiometricAutoPrompt,
  clearBiometricAutoPromptSuppression,
  isBiometricAutoPromptSuppressed,
  shouldAutoPromptBiometrics,
  shouldSuppressBiometricAutoPrompt,
  suppressBiometricAutoPrompt,
} from './biometric-auto-prompt';

vi.mock('./action-popup-classifier', () => ({
  isCurrentWindowActionPopup: vi.fn(() => true),
}));

const promptable = {
  isBiometricOnly: true,
  isActionPopup: true,
  isSuppressed: false,
  hasPromptedThisOpen: false,
};

describe(shouldAutoPromptBiometrics.name, () => {
  test('prompts once in the action popup of a biometric-only profile', () => {
    expect(shouldAutoPromptBiometrics(promptable)).toBe(true);
  });

  test('does not prompt a second time in the same open', () => {
    expect(shouldAutoPromptBiometrics({ ...promptable, hasPromptedThisOpen: true })).toBe(false);
  });

  test('does not prompt outside the action popup', () => {
    expect(shouldAutoPromptBiometrics({ ...promptable, isActionPopup: false })).toBe(false);
  });

  test('does not prompt for a password profile', () => {
    expect(shouldAutoPromptBiometrics({ ...promptable, isBiometricOnly: false })).toBe(false);
  });

  test('does not prompt after a suppressing failure', () => {
    expect(shouldAutoPromptBiometrics({ ...promptable, isSuppressed: true })).toBe(false);
  });
});

describe(shouldSuppressBiometricAutoPrompt.name, () => {
  test.each(['credential-mismatch', 'invalid-config', 'no-prf', 'wallet-validation'] as const)(
    'suppresses after a %s failure',
    category => {
      expect(shouldSuppressBiometricAutoPrompt(category)).toBe(true);
    }
  );

  test.each(['canceled', 'unknown', 'stale-state', 'unsupported'] as const)(
    'keeps prompting after a %s failure',
    category => {
      expect(shouldSuppressBiometricAutoPrompt(category)).toBe(false);
    }
  );
});

describe('auto-prompt suppression storage', () => {
  test('is stored in session storage until cleared', async () => {
    await expect(isBiometricAutoPromptSuppressed()).resolves.toBe(false);

    await suppressBiometricAutoPrompt();
    await expect(isBiometricAutoPromptSuppressed()).resolves.toBe(true);
    await expect(
      chrome.storage.session.get(['biometricUnlockAutomaticPromptSuppressed'])
    ).resolves.toEqual({ biometricUnlockAutomaticPromptSuppressed: true });

    await clearBiometricAutoPromptSuppression();
    await expect(isBiometricAutoPromptSuppressed()).resolves.toBe(false);
  });
});

describe(claimBiometricAutoPrompt.name, () => {
  test('does not claim outside the action popup', async () => {
    vi.mocked(isCurrentWindowActionPopup).mockReturnValueOnce(false);
    await expect(claimBiometricAutoPrompt(true)).resolves.toBe(false);
  });

  test('does not claim while suppressed', async () => {
    await suppressBiometricAutoPrompt();
    await expect(claimBiometricAutoPrompt(true)).resolves.toBe(false);
  });

  test('claims the prompt only once per open', async () => {
    await expect(claimBiometricAutoPrompt(false)).resolves.toBe(false);
    await expect(claimBiometricAutoPrompt(true)).resolves.toBe(true);
    await expect(claimBiometricAutoPrompt(true)).resolves.toBe(false);
  });
});
