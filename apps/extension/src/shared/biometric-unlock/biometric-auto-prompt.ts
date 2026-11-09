import type { BiometricUnlockFailureCategory } from '@leather.io/analytics';

const suppressionStorageKey = 'biometricUnlockAutomaticPromptSuppressed';

const suppressingFailureCategories: readonly BiometricUnlockFailureCategory[] = [
  'credential-mismatch',
  'invalid-config',
  'no-prf',
  'wallet-validation',
];

export function doesFailureSuppressAutoPrompt(category: BiometricUnlockFailureCategory) {
  return suppressingFailureCategories.includes(category);
}

export async function isBiometricAutoPromptSuppressed() {
  const stored = await chrome.storage.session.get([suppressionStorageKey]);
  return stored[suppressionStorageKey] === true;
}

export async function suppressBiometricAutoPrompt() {
  return chrome.storage.session.set({ [suppressionStorageKey]: true });
}

export async function clearBiometricAutoPromptSuppression() {
  return chrome.storage.session.remove(suppressionStorageKey);
}

interface ShouldAutoPromptBiometricsArgs {
  isActionPopup: boolean;
  isSuppressed: boolean;
  hasAutoPrompted: boolean;
}
export function shouldAutoPromptBiometrics({
  isActionPopup,
  isSuppressed,
  hasAutoPrompted,
}: ShouldAutoPromptBiometricsArgs) {
  return isActionPopup && !isSuppressed && !hasAutoPrompted;
}

let hasAutoPromptedThisOpen = false;

export function claimBiometricAutoPrompt(isActionPopup: boolean, isSuppressed: boolean) {
  const shouldPrompt = shouldAutoPromptBiometrics({
    isActionPopup,
    isSuppressed,
    hasAutoPrompted: hasAutoPromptedThisOpen,
  });
  if (shouldPrompt) hasAutoPromptedThisOpen = true;
  return shouldPrompt;
}
