import type { BiometricUnlockFailureCategory } from '@shared/crypto/platform-authenticator';

export const biometricUnavailableMessage =
  "Biometric unlock isn't available in this browser context.";

export function getBiometricEnrollmentErrorMessage(category: BiometricUnlockFailureCategory) {
  if (category === 'no-prf') {
    return "The passkey provider you chose can't be used for biometric unlock. Save the passkey on this device and try again, or continue with a password.";
  }
  return 'Biometric unlock could not be set up. Try again or continue with a password.';
}

export function getBiometricUnlockErrorMessage(category: BiometricUnlockFailureCategory) {
  if (category === 'canceled') return 'Biometric unlock was canceled.';
  return "Biometric unlock didn't work. Try again, or sign out and sign back in with your Secret Key.";
}

export function getBiometricUnlockButtonLabel(hasFailed: boolean) {
  return hasFailed ? 'Try biometric unlock again' : 'Unlock with biometrics';
}
