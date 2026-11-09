import type { BiometricUnlockFailureCategory } from '@shared/crypto/platform-authenticator';

import { isCurrentWindowActionPopup } from './action-popup-classifier';

const autoPromptSuppressedKey = 'biometricUnlockAutomaticPromptSuppressed';

const suppressingFailureCategories: readonly BiometricUnlockFailureCategory[] = [
  'credential-mismatch',
  'invalid-config',
  'no-prf',
  'wallet-validation',
];

export function shouldSuppressBiometricAutoPrompt(category: BiometricUnlockFailureCategory) {
  return suppressingFailureCategories.includes(category);
}

interface ShouldAutoPromptBiometricsArgs {
  isBiometricOnly: boolean;
  isActionPopup: boolean;
  isSuppressed: boolean;
  hasPromptedThisOpen: boolean;
}
export function shouldAutoPromptBiometrics({
  isBiometricOnly,
  isActionPopup,
  isSuppressed,
  hasPromptedThisOpen,
}: ShouldAutoPromptBiometricsArgs) {
  return isBiometricOnly && isActionPopup && !isSuppressed && !hasPromptedThisOpen;
}

export async function isBiometricAutoPromptSuppressed() {
  try {
    const stored = await chrome.storage.session.get([autoPromptSuppressedKey]);
    return stored[autoPromptSuppressedKey] === true;
  } catch {
    return true;
  }
}

export async function suppressBiometricAutoPrompt() {
  return chrome.storage.session.set({ [autoPromptSuppressedKey]: true });
}

export async function clearBiometricAutoPromptSuppression() {
  return chrome.storage.session.remove(autoPromptSuppressedKey);
}

let hasAutoPromptedThisOpen = false;

export async function claimBiometricAutoPrompt(isBiometricOnly: boolean) {
  const shouldPrompt = shouldAutoPromptBiometrics({
    isBiometricOnly,
    isActionPopup: isCurrentWindowActionPopup(),
    isSuppressed: await isBiometricAutoPromptSuppressed(),
    hasPromptedThisOpen: hasAutoPromptedThisOpen,
  });
  if (shouldPrompt) hasAutoPromptedThisOpen = true;
  return shouldPrompt;
}
