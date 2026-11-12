import { HardwareWalletError } from '../contract/hardware-wallet-error';
import {
  LedgerConnectionErrors,
  ledgerActionCancelledErrorName,
  makeLedgerAppResponseError,
  makeLedgerDeviceNotPairedError,
} from '../dmk/ledger-dmk-errors';
import { toHardwareWalletError, withLedgerErrors } from './ledger-error-mapping';

function makeNamedError(name: string, message = name) {
  const error = new Error(message);
  error.name = name;
  return error;
}

const transportFailure = makeLedgerAppResponseError({
  returnCode: 0xffff,
  errorMessage: 'Device Management Kit failed to send APDU',
});

describe(toHardwareWalletError.name, () => {
  test.each([
    ['a cancelled device action', makeNamedError(ledgerActionCancelledErrorName), 'cancelled'],
    ['a locked device', { _tag: 'DeviceLockedError' }, 'locked'],
    ['a locked status code', { statusCode: 0x5515 }, 'locked'],
    ['a disconnected device', { _tag: 'DeviceSessionNotFound' }, 'disconnected'],
    ['a transport failure', transportFailure, 'disconnected'],
    [
      'an operation rejected on the device',
      makeNamedError(LedgerConnectionErrors.OperationRejected),
      'rejected',
    ],
    ['a denied status code', { statusCode: 0x6985 }, 'rejected'],
    ['an unpaired device', makeLedgerDeviceNotPairedError(), 'not-paired'],
    ['a dismissed device chooser', { _tag: 'NoAccessibleDeviceError' }, 'no-device-selected'],
    ['a device in use', { _tag: 'ConnectionOpeningError' }, 'busy'],
    [
      'an app that failed to open',
      makeNamedError(LedgerConnectionErrors.AppOpenFailed),
      'wrong-app',
    ],
    [
      'an app-level error response',
      makeLedgerAppResponseError({ returnCode: 0x6f00, errorMessage: 'Unknown error' }),
      'unknown',
    ],
    ['a plain error', new Error('boom'), 'unknown'],
    ['a non-error value', 'boom', 'unknown'],
  ])('maps %s', (_, error, kind) => {
    const mapped = toHardwareWalletError(error);

    expect(mapped).toBeInstanceOf(HardwareWalletError);
    expect(mapped.kind).toBe(kind);
    expect(mapped.cause).toBe(error);
  });

  test('returns hardware wallet errors unchanged', () => {
    const error = new HardwareWalletError('outdated-app');

    expect(toHardwareWalletError(error)).toBe(error);
  });

  test('keeps the app-open failure message', () => {
    const error = makeNamedError(
      LedgerConnectionErrors.AppOpenFailed,
      'Unable to open the Bitcoin app on your Ledger.'
    );

    expect(toHardwareWalletError(error).message).toBe(
      'Unable to open the Bitcoin app on your Ledger.'
    );
  });

  test('explains a dismissed device chooser and a device in use', () => {
    expect(toHardwareWalletError({ _tag: 'NoAccessibleDeviceError' }).message).toBe(
      'Click "Try again" and choose your Ledger in the browser prompt.'
    );
    expect(toHardwareWalletError({ _tag: 'ConnectionOpeningError' }).message).toBe(
      'Your Ledger is in use by another app. Close Ledger Live and any other Leather windows, then try again.'
    );
  });

  test('keeps the device message of a transport failure', () => {
    expect(toHardwareWalletError(transportFailure).message).toBe(
      'Device Management Kit failed to send APDU'
    );
  });

  test('keeps the message of an unknown error', () => {
    expect(toHardwareWalletError(new Error('No tx returned')).message).toBe('No tx returned');
  });
});

describe(withLedgerErrors.name, () => {
  test('resolves with the operation result', async () => {
    await expect(withLedgerErrors(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });

  test('rejects with the mapped hardware wallet error', async () => {
    await expect(
      withLedgerErrors(() =>
        Promise.reject(Object.assign(new Error('Device locked'), { _tag: 'DeviceLockedError' }))
      )
    ).rejects.toMatchObject({ kind: 'locked' });
  });
});
