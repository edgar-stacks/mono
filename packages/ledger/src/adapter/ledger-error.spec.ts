import { DeviceLockedError, RefusedByUserDAError } from '@ledgerhq/device-management-kit';
import { LedgerError } from '@zondax/ledger-stacks';

import { HardwareWalletError } from '../contract/hardware-wallet-error';
import {
  LedgerConnectionErrors,
  deviceInUseErrorMessage,
  makeLedgerAppResponseError,
  makeLedgerDeviceNotPairedError,
  noDeviceSelectedErrorMessage,
} from '../dmk/ledger-dmk-errors';
import {
  assertLedgerAppResponseSucceeded,
  ledgerAppResponseToHardwareWalletError,
  toHardwareWalletError,
  withLedgerErrors,
} from './ledger-error';

const unknownTransportReturnCode = 0xffff;
const transportFailureMessage =
  'Device Management Kit failed to send APDU: DeviceDisconnectedWhileSendingError';

function captureError(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return undefined;
}

function makeNamedError(name: string, message = name) {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe(toHardwareWalletError.name, () => {
  test('returns hardware wallet errors unchanged', () => {
    const error = new HardwareWalletError('busy');

    expect(toHardwareWalletError(error)).toBe(error);
  });

  test.each([
    ['a cancelled device action', makeNamedError('LedgerActionCancelled'), 'cancelled'],
    ['a locked device', new DeviceLockedError(), 'locked'],
    [
      'a locked device status code',
      Object.assign(new Error('locked'), { statusCode: 0x5515 }),
      'locked',
    ],
    ['a disconnected device', { _tag: 'DeviceSessionNotFound' }, 'disconnected'],
    [
      'a transport failure with a disconnect cause',
      makeLedgerAppResponseError({
        returnCode: unknownTransportReturnCode,
        errorMessage: transportFailureMessage,
        cause: { _tag: 'DeviceDisconnectedWhileSendingError' },
      }),
      'disconnected',
    ],
    [
      'a transport failure without a cause',
      makeLedgerAppResponseError({
        returnCode: unknownTransportReturnCode,
        errorMessage: transportFailureMessage,
      }),
      'disconnected',
    ],
    [
      'a rejection on the device',
      makeNamedError(LedgerConnectionErrors.OperationRejected),
      'rejected',
    ],
    ['a refused device action', new RefusedByUserDAError(), 'rejected'],
    [
      'a denied status code',
      Object.assign(new Error('denied'), { statusCode: 0x6985 }),
      'rejected',
    ],
    ['an unpaired device', makeLedgerDeviceNotPairedError(), 'not-paired'],
    [
      'an app response error',
      makeLedgerAppResponseError({ returnCode: 0x6f00, errorMessage: 'Unknown error' }),
      'unknown',
    ],
    ['an unrecognised error', new Error('boom'), 'unknown'],
    ['a thrown string', 'boom', 'unknown'],
  ])('maps %s to the %s kind', (_label, error, kind) => {
    const mapped = toHardwareWalletError(error);

    expect(mapped).toBeInstanceOf(HardwareWalletError);
    expect(mapped.kind).toBe(kind);
    expect(mapped.cause).toBe(error);
  });

  test('keeps the app-open failure message as a wrong-app error', () => {
    const error = makeNamedError(
      LedgerConnectionErrors.AppOpenFailed,
      'Unable to open the Bitcoin app on your Ledger.'
    );

    expect(toHardwareWalletError(error)).toMatchObject({
      kind: 'wrong-app',
      message: error.message,
    });
  });

  test('explains a cancelled device chooser and a device in use', () => {
    expect(toHardwareWalletError({ _tag: 'NoAccessibleDeviceError' })).toMatchObject({
      kind: 'no-device-selected',
      message: noDeviceSelectedErrorMessage,
    });
    expect(toHardwareWalletError({ _tag: 'ConnectionOpeningError' })).toMatchObject({
      kind: 'busy',
      message: deviceInUseErrorMessage,
    });
  });

  test('keeps the message of an unrecognised error', () => {
    expect(toHardwareWalletError(new Error('boom')).message).toBe('boom');
  });
});

describe(ledgerAppResponseToHardwareWalletError.name, () => {
  test.each([
    [LedgerError.TransactionRejected, 'rejected'],
    [LedgerError.DataIsInvalid, 'invalid-payload'],
    [0x5515, 'locked'],
    [unknownTransportReturnCode, 'disconnected'],
    [0x6f00, 'unknown'],
  ])('maps return code %s to the %s kind', (returnCode, kind) => {
    const error = ledgerAppResponseToHardwareWalletError({
      returnCode,
      errorMessage: 'Device error',
    });

    expect(error.kind).toBe(kind);
  });

  test('keeps the device message for app-level errors', () => {
    expect(
      ledgerAppResponseToHardwareWalletError({
        returnCode: LedgerError.DataIsInvalid,
        errorMessage: 'Data is invalid',
      }).message
    ).toBe('Data is invalid');
  });
});

describe(assertLedgerAppResponseSucceeded.name, () => {
  test('accepts a successful response', () => {
    expect(() =>
      assertLedgerAppResponseSucceeded({
        returnCode: LedgerError.NoErrors,
        errorMessage: 'No errors',
      })
    ).not.toThrow();
  });

  test('throws the mapped error for a failed response', () => {
    expect(
      captureError(() =>
        assertLedgerAppResponseSucceeded({
          returnCode: LedgerError.TransactionRejected,
          errorMessage: 'Transaction rejected',
        })
      )
    ).toMatchObject({ kind: 'rejected' });
  });
});

describe(withLedgerErrors.name, () => {
  test('resolves with the operation result', async () => {
    await expect(withLedgerErrors(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });

  test('rejects with the mapped hardware wallet error', async () => {
    await expect(
      withLedgerErrors(vi.fn().mockRejectedValue(new DeviceLockedError()))
    ).rejects.toMatchObject({ kind: 'locked' });
  });
});
