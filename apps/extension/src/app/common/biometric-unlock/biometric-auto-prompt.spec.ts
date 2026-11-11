import { beforeEach, describe, expect, test, vi } from 'vitest';

const suppressionStorageKey = 'biometricUnlockAutomaticPromptSuppressed';

async function importAutoPrompt() {
  vi.resetModules();
  return import('./biometric-auto-prompt');
}

async function readSuppression(): Promise<unknown> {
  const stored: Record<string, unknown> = await chrome.storage.session.get([suppressionStorageKey]);
  return stored[suppressionStorageKey];
}

describe('biometric auto prompt', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('prompts once per open in a real action popup', async () => {
    const { claimAutomaticPrompt } = await importAutoPrompt();
    await expect(claimAutomaticPrompt({ isActionPopup: true })).resolves.toBe(true);
    await expect(claimAutomaticPrompt({ isActionPopup: true })).resolves.toBe(false);
  });

  test('never prompts outside the action popup', async () => {
    const { claimAutomaticPrompt } = await importAutoPrompt();
    await expect(claimAutomaticPrompt({ isActionPopup: false })).resolves.toBe(false);
    await expect(claimAutomaticPrompt({ isActionPopup: true })).resolves.toBe(true);
  });

  test.each(['credential-mismatch', 'invalid-config', 'no-prf', 'wallet-validation'] as const)(
    'a %s failure suppresses the prompt for the session',
    async category => {
      const { claimAutomaticPrompt, recordBiometricFailure } = await importAutoPrompt();
      await recordBiometricFailure(category);

      await expect(readSuppression()).resolves.toBe(true);
      await expect(claimAutomaticPrompt({ isActionPopup: true })).resolves.toBe(false);
    }
  );

  test.each(['canceled', 'unavailable', 'unknown'] as const)(
    'a %s failure does not suppress the prompt',
    async category => {
      const { claimAutomaticPrompt, recordBiometricFailure } = await importAutoPrompt();
      await recordBiometricFailure(category);

      await expect(readSuppression()).resolves.toBeUndefined();
      await expect(claimAutomaticPrompt({ isActionPopup: true })).resolves.toBe(true);
    }
  );

  test('clearing the suppression lets a later popup prompt again', async () => {
    const { recordBiometricFailure, clearAutomaticPromptSuppression } = await importAutoPrompt();
    await recordBiometricFailure('credential-mismatch');
    await clearAutomaticPromptSuppression();
    await expect(readSuppression()).resolves.toBeUndefined();

    const { claimAutomaticPrompt } = await importAutoPrompt();
    await expect(claimAutomaticPrompt({ isActionPopup: true })).resolves.toBe(true);
  });
});
