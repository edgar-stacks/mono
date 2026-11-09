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

export interface HardwareWalletErrorDetails {
  currentVersion?: string;
  requiredVersion?: string;
}

interface HardwareWalletErrorOptions {
  details?: HardwareWalletErrorDetails;
  cause?: unknown;
}

const defaultErrorMessages: Record<HardwareWalletErrorKind, string> = {
  locked: 'The hardware wallet is locked',
  disconnected: 'The hardware wallet was disconnected',
  rejected: 'The operation was rejected on the hardware wallet',
  'not-paired': 'No hardware wallet has been paired',
  'no-device-selected': 'No hardware wallet was selected',
  busy: 'The hardware wallet is in use by another app',
  'wrong-app': 'The wrong app is open on the hardware wallet',
  'outdated-app': 'The app on the hardware wallet is outdated',
  'invalid-payload': 'The hardware wallet could not process the request',
  cancelled: 'The hardware wallet operation was cancelled',
  unsupported: 'The hardware wallet does not support this operation',
  unknown: 'Unknown hardware wallet error',
};

export class HardwareWalletError extends Error {
  readonly kind: HardwareWalletErrorKind;
  readonly details: HardwareWalletErrorDetails;

  constructor(
    kind: HardwareWalletErrorKind,
    message: string = defaultErrorMessages[kind],
    { details = {}, cause }: HardwareWalletErrorOptions = {}
  ) {
    super(message, { cause });
    this.name = 'HardwareWalletError';
    this.kind = kind;
    this.details = details;
  }
}

export function isHardwareWalletErrorKind(error: unknown, kind: HardwareWalletErrorKind): boolean {
  return error instanceof HardwareWalletError && error.kind === kind;
}

export function throwIfOperationAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new HardwareWalletError('cancelled');
}
