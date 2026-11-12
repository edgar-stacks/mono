export const hardwareWalletErrorKinds = [
  'locked',
  'disconnected',
  'rejected',
  'not-paired',
  'no-device-selected',
  'busy',
  'wrong-app',
  'outdated-app',
  'invalid-payload',
  'cancelled',
  'unsupported',
  'unknown',
] as const;

export type HardwareWalletErrorKind = (typeof hardwareWalletErrorKinds)[number];

export interface HardwareWalletAppVersionDetails {
  currentVersion: string;
  requiredVersion: string;
}

const defaultHardwareWalletErrorMessages: Record<HardwareWalletErrorKind, string> = {
  locked: 'The hardware wallet is locked',
  disconnected: 'The hardware wallet was disconnected',
  rejected: 'The operation was rejected on the hardware wallet',
  'not-paired': 'No hardware wallet has been paired',
  'no-device-selected': 'No hardware wallet was selected',
  busy: 'The hardware wallet is in use by another app',
  'wrong-app': 'The expected app is not open on the hardware wallet',
  'outdated-app': 'The app on the hardware wallet is outdated',
  'invalid-payload': 'The hardware wallet could not process the request',
  cancelled: 'The hardware wallet operation was cancelled',
  unsupported: 'The hardware wallet does not support this operation',
  unknown: 'Unknown hardware wallet error',
};

interface HardwareWalletErrorOptions {
  details?: HardwareWalletAppVersionDetails;
  cause?: unknown;
}

export class HardwareWalletError extends Error {
  readonly kind: HardwareWalletErrorKind;
  readonly details: HardwareWalletAppVersionDetails | null;

  constructor(
    kind: HardwareWalletErrorKind,
    message: string = defaultHardwareWalletErrorMessages[kind],
    { details, cause }: HardwareWalletErrorOptions = {}
  ) {
    super(message, { cause });
    this.name = 'HardwareWalletError';
    this.kind = kind;
    this.details = details ?? null;
  }
}

export function isHardwareWalletError(error: unknown) {
  return error instanceof HardwareWalletError;
}

export function throwIfOperationAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new HardwareWalletError('cancelled');
}
