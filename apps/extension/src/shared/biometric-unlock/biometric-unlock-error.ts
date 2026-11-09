import type { BiometricUnlockFailureCategory } from '@leather.io/analytics';

export class BiometricUnlockError extends Error {
  readonly category: BiometricUnlockFailureCategory;

  constructor(category: BiometricUnlockFailureCategory, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BiometricUnlockError';
    this.category = category;
  }
}

function getErrorName(error: unknown) {
  if (typeof error !== 'object' || error === null || !('name' in error)) return undefined;
  return typeof error.name === 'string' ? error.name : undefined;
}

export function getBiometricUnlockFailureCategory(error: unknown): BiometricUnlockFailureCategory {
  if (error instanceof BiometricUnlockError) return error.category;
  switch (getErrorName(error)) {
    case 'NotAllowedError':
    case 'AbortError':
      return 'canceled';
    case 'NotSupportedError':
    case 'SecurityError':
      return 'unavailable';
    default:
      return 'unknown';
  }
}
