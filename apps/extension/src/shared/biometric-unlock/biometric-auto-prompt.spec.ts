import {
  clearBiometricAutoPromptSuppression,
  doesFailureSuppressAutoPrompt,
  isBiometricAutoPromptSuppressed,
  shouldAutoPromptBiometrics,
  suppressBiometricAutoPrompt,
} from './biometric-auto-prompt';

describe('biometric auto prompt', () => {
  describe(shouldAutoPromptBiometrics.name, () => {
    test('prompts once in the action popup when not suppressed', () => {
      expect(
        shouldAutoPromptBiometrics({
          isActionPopup: true,
          isSuppressed: false,
          hasAutoPrompted: false,
        })
      ).toBe(true);
    });

    test('does not prompt outside the action popup', () => {
      expect(
        shouldAutoPromptBiometrics({
          isActionPopup: false,
          isSuppressed: false,
          hasAutoPrompted: false,
        })
      ).toBe(false);
    });

    test('does not prompt when suppressed or already prompted', () => {
      expect(
        shouldAutoPromptBiometrics({
          isActionPopup: true,
          isSuppressed: true,
          hasAutoPrompted: false,
        })
      ).toBe(false);
      expect(
        shouldAutoPromptBiometrics({
          isActionPopup: true,
          isSuppressed: false,
          hasAutoPrompted: true,
        })
      ).toBe(false);
    });
  });

  describe(doesFailureSuppressAutoPrompt.name, () => {
    test.each(['credential-mismatch', 'invalid-config', 'no-prf', 'wallet-validation'] as const)(
      'suppresses after %s',
      category => {
        expect(doesFailureSuppressAutoPrompt(category)).toBe(true);
      }
    );

    test.each(['canceled', 'unavailable', 'unknown'] as const)(
      'keeps prompting after %s',
      category => {
        expect(doesFailureSuppressAutoPrompt(category)).toBe(false);
      }
    );
  });

  test('stores suppression in session storage until cleared', async () => {
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
