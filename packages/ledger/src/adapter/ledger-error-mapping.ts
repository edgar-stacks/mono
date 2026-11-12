import { isError } from '@leather.io/utils';

import {
  HardwareWalletError,
  type HardwareWalletErrorKind,
  isHardwareWalletError,
} from '../contract/hardware-wallet-error';
import {
  isLedgerActionCancelledError,
  isLedgerAppOpenFailedError,
  isLedgerDeviceDisconnectedError,
  isLedgerDeviceInUseError,
  isLedgerDeviceLockedError,
  isLedgerDeviceNotPairedError,
  isLedgerNoDeviceSelectedError,
  isLedgerOperationRejectedError,
  isLedgerTransportFailureError,
  isLedgerUserDeniedError,
} from '../dmk/ledger-dmk-errors';

const noDeviceSelectedErrorMessage =
  'Click "Try again" and choose your Ledger in the browser prompt.';
const deviceInUseErrorMessage =
  'Your Ledger is in use by another app. Close Ledger Live and any other Leather windows, then try again.';

function getErrorMessage(error: unknown): string | undefined {
  if (isError(error) && error.message.length > 0) return error.message;
  return undefined;
}

interface LedgerErrorKindMatcher {
  kind: HardwareWalletErrorKind;
  matches(error: unknown): boolean;
  message?(error: unknown): string | undefined;
}

const ledgerErrorKindMatchers: readonly LedgerErrorKindMatcher[] = [
  { kind: 'cancelled', matches: isLedgerActionCancelledError },
  { kind: 'locked', matches: isLedgerDeviceLockedError },
  { kind: 'wrong-app', matches: isLedgerAppOpenFailedError },
  { kind: 'disconnected', matches: isLedgerDeviceDisconnectedError },
  {
    kind: 'rejected',
    matches: error => isLedgerOperationRejectedError(error) || isLedgerUserDeniedError(error),
  },
  { kind: 'not-paired', matches: isLedgerDeviceNotPairedError },
  {
    kind: 'no-device-selected',
    matches: isLedgerNoDeviceSelectedError,
    message: () => noDeviceSelectedErrorMessage,
  },
  { kind: 'busy', matches: isLedgerDeviceInUseError, message: () => deviceInUseErrorMessage },
  { kind: 'disconnected', matches: isLedgerTransportFailureError },
];

export function toHardwareWalletError(error: unknown): HardwareWalletError {
  if (isHardwareWalletError(error)) return error;
  const matcher = ledgerErrorKindMatchers.find(candidate => candidate.matches(error));
  const kind = matcher?.kind ?? 'unknown';
  const message = matcher?.message?.(error) ?? getErrorMessage(error);
  return new HardwareWalletError(kind, message, { cause: error });
}

export async function withLedgerErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toHardwareWalletError(error);
  }
}
