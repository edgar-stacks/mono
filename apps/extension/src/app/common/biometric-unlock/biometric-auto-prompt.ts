import { z } from 'zod';

import type { PlatformUnlockFailureCategory } from '@shared/crypto/platform-authenticator';

const suppressionStorageKey = 'biometricUnlockAutomaticPromptSuppressed';

const suppressingFailureCategories: readonly PlatformUnlockFailureCategory[] = [
  'credential-mismatch',
  'invalid-config',
  'no-prf',
  'wallet-validation',
];

let hasAutomaticallyPrompted = false;

function doesFailureSuppressAutomaticPrompt(category: PlatformUnlockFailureCategory) {
  return suppressingFailureCategories.includes(category);
}

async function isAutomaticPromptSuppressed() {
  const stored = await chrome.storage.session.get([suppressionStorageKey]);
  const result = z.boolean().safeParse(stored[suppressionStorageKey]);
  return result.success && result.data;
}

async function suppressAutomaticPrompt() {
  await chrome.storage.session.set({ [suppressionStorageKey]: true });
}

export async function clearAutomaticPromptSuppression() {
  await chrome.storage.session.remove(suppressionStorageKey);
}

export async function recordBiometricFailure(category: PlatformUnlockFailureCategory) {
  if (doesFailureSuppressAutomaticPrompt(category)) await suppressAutomaticPrompt();
}

interface ClaimAutomaticPromptArgs {
  isActionPopup: boolean;
}
export async function claimAutomaticPrompt({ isActionPopup }: ClaimAutomaticPromptArgs) {
  if (!isActionPopup || hasAutomaticallyPrompted) return false;
  hasAutomaticallyPrompted = true;
  try {
    return !(await isAutomaticPromptSuppressed());
  } catch {
    return false;
  }
}
