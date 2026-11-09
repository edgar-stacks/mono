import { LedgerError } from '@zondax/ledger-stacks';

import { HardwareWalletError, isHardwareWalletError } from '../contract/hardware-wallet-error';
import {
  deviceInUseErrorMessage,
  isLedgerActionCancelledError,
  isLedgerAppOpenFailedError,
  isLedgerDeviceDisconnectedError,
  isLedgerDeviceInUseError,
  isLedgerDeviceLockedError,
  isLedgerDeviceNotPairedError,
  isLedgerNoDeviceSelectedError,
  isLedgerTransportFailureError,
  isLedgerUserDeniedError,
  isLedgerUserRefusedDeviceActionError,
  noDeviceSelectedErrorMessage,
} from '../dmk/ledger-dmk-errors';

const transactionRejectedStatusCode: number = LedgerError.TransactionRejected;
const dataIsInvalidStatusCode: number = LedgerError.DataIsInvalid;

function hasStatusCode(error: unknown, statusCode: number): boolean {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return false;
  return error.statusCode === statusCode;
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return undefined;
}

function isRejectedError(error: unknown): boolean {
  return (
    isLedgerUserDeniedError(error) ||
    isLedgerUserRefusedDeviceActionError(error) ||
    hasStatusCode(error, transactionRejectedStatusCode)
  );
}

export function toHardwareWalletError(error: unknown): HardwareWalletError {
  if (isHardwareWalletError(error)) return error;
  const message = getErrorMessage(error);
  const options = { cause: error };
  if (isLedgerActionCancelledError(error))
    return new HardwareWalletError('cancelled', message, options);
  if (isLedgerDeviceLockedError(error)) return new HardwareWalletError('locked', message, options);
  if (isLedgerAppOpenFailedError(error))
    return new HardwareWalletError('wrong-app', message, options);
  if (isLedgerDeviceDisconnectedError(error))
    return new HardwareWalletError('disconnected', message, options);
  if (isRejectedError(error)) return new HardwareWalletError('rejected', message, options);
  if (isLedgerDeviceNotPairedError(error))
    return new HardwareWalletError('not-paired', message, options);
  if (isLedgerNoDeviceSelectedError(error))
    return new HardwareWalletError('no-device-selected', noDeviceSelectedErrorMessage, options);
  if (isLedgerDeviceInUseError(error))
    return new HardwareWalletError('busy', deviceInUseErrorMessage, options);
  if (isLedgerTransportFailureError(error))
    return new HardwareWalletError('disconnected', message, options);
  if (hasStatusCode(error, dataIsInvalidStatusCode))
    return new HardwareWalletError('invalid-payload', message, options);
  return new HardwareWalletError('unknown', message, options);
}

export function withLedgerErrors<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw toHardwareWalletError(error);
    }
  };
}
