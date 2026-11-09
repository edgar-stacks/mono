import { LedgerError, type ResponseBase } from '@zondax/ledger-stacks';

import { isError } from '@leather.io/utils';

import { HardwareWalletError } from '../contract/hardware-wallet-error';
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
  makeLedgerAppResponseError,
  noDeviceSelectedErrorMessage,
} from '../dmk/ledger-dmk-errors';
import { hasLedgerReturnCode } from '../stacks/stacks-ledger-utils';

export function toHardwareWalletError(error: unknown): HardwareWalletError {
  if (error instanceof HardwareWalletError) return error;
  const options = { cause: error };
  const message = isError(error) ? error.message : undefined;

  if (isLedgerActionCancelledError(error))
    return new HardwareWalletError('cancelled', undefined, options);
  if (isLedgerDeviceLockedError(error))
    return new HardwareWalletError('locked', undefined, options);
  if (isLedgerAppOpenFailedError(error))
    return new HardwareWalletError('wrong-app', message, options);
  if (isLedgerDeviceDisconnectedError(error) || isLedgerTransportFailureError(error))
    return new HardwareWalletError('disconnected', message, options);
  if (isLedgerUserDeniedError(error) || isLedgerUserRefusedDeviceActionError(error))
    return new HardwareWalletError('rejected', message, options);
  if (isLedgerDeviceNotPairedError(error))
    return new HardwareWalletError('not-paired', message, options);
  if (isLedgerNoDeviceSelectedError(error))
    return new HardwareWalletError('no-device-selected', noDeviceSelectedErrorMessage, options);
  if (isLedgerDeviceInUseError(error))
    return new HardwareWalletError('busy', deviceInUseErrorMessage, options);
  return new HardwareWalletError('unknown', message, options);
}

export function ledgerAppResponseToHardwareWalletError(
  response: ResponseBase
): HardwareWalletError {
  const options = { cause: response };
  if (hasLedgerReturnCode(response, LedgerError.TransactionRejected))
    return new HardwareWalletError('rejected', response.errorMessage, options);
  if (hasLedgerReturnCode(response, LedgerError.DataIsInvalid))
    return new HardwareWalletError('invalid-payload', response.errorMessage, options);
  return toHardwareWalletError(makeLedgerAppResponseError(response));
}

export function assertLedgerAppResponseSucceeded(response: ResponseBase): void {
  if (!hasLedgerReturnCode(response, LedgerError.NoErrors))
    throw ledgerAppResponseToHardwareWalletError(response);
}

export async function withLedgerErrors<Result>(operation: () => Promise<Result>): Promise<Result> {
  try {
    return await operation();
  } catch (error) {
    throw toHardwareWalletError(error);
  }
}
