import { HardwareWalletError } from '../contract/hardware-wallet-error';
import {
  LedgerConnectionErrors,
  makeLedgerAppResponseError,
  makeLedgerDeviceNotPairedError,
} from '../dmk/ledger-dmk-errors';
import { toHardwareWalletError, withLedgerErrors } from './ledger-error-mapping';

const unknownTransportReturnCode = 0xffff;
const transportFailureMessage =
  'Device Management Kit failed to send APDU: DeviceDisconnectedWhileSendingError';
const noDeviceSelectedErrorMessage =
  'Click "Try again" and choose your Ledger in the browser prompt.';
const deviceInUseErrorMessage =
  'Your Ledger is in use by another app. Close Ledger Live and any other Leather windows, then try again.';

function makeNamedError(name: string) {
  const error = new Error(name);
  error.name = name;
  return error;
}

describe(toHardwareWalletError.name, () => {
  test('returns hardware wallet errors unchanged', () => {
    const error = new HardwareWalletError('outdated-app');

    expect(toHardwareWalletError(error)).toBe(error);
  });

  test('maps a cancelled device action', () => {
    expect(toHardwareWalletError(makeNamedError('LedgerActionCancelled')).kind).toBe('cancelled');
  });

  test('maps a locked device', () => {
    expect(toHardwareWalletError({ _tag: 'DeviceLockedError' }).kind).toBe('locked');
    expect(
      toHardwareWalletError(makeLedgerAppResponseError({ returnCode: 0x5515, errorMessage: '' }))
        .kind
    ).toBe('locked');
  });

  test('maps an app that failed to open and keeps its message', () => {
    const error = makeNamedError(LedgerConnectionErrors.AppOpenFailed);

    expect(toHardwareWalletError(error)).toMatchObject({
      kind: 'wrong-app',
      message: error.message,
    });
  });

  test('maps disconnects and transport failures', () => {
    expect(toHardwareWalletError({ _tag: 'DeviceSessionNotFound' }).kind).toBe('disconnected');
    expect(
      toHardwareWalletError(
        makeLedgerAppResponseError({
          returnCode: unknownTransportReturnCode,
          errorMessage: transportFailureMessage,
          cause: { _tag: 'DeviceDisconnectedWhileSendingError' },
        })
      ).kind
    ).toBe('disconnected');
    expect(
      toHardwareWalletError(
        makeLedgerAppResponseError({
          returnCode: unknownTransportReturnCode,
          errorMessage: transportFailureMessage,
        })
      ).kind
    ).toBe('disconnected');
  });

  test('maps rejections on the device', () => {
    expect(
      toHardwareWalletError(makeNamedError(LedgerConnectionErrors.OperationRejected)).kind
    ).toBe('rejected');
    expect(toHardwareWalletError({ _tag: 'RefusedByUserDAError' }).kind).toBe('rejected');
    expect(
      toHardwareWalletError(makeLedgerAppResponseError({ returnCode: 0x6985, errorMessage: '' }))
        .kind
    ).toBe('rejected');
    expect(
      toHardwareWalletError(
        makeLedgerAppResponseError({ returnCode: 0x6986, errorMessage: 'Transaction rejected' })
      ).kind
    ).toBe('rejected');
  });

  test('maps an unpaired device', () => {
    expect(toHardwareWalletError(makeLedgerDeviceNotPairedError()).kind).toBe('not-paired');
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

  test('maps an invalid payload response', () => {
    expect(
      toHardwareWalletError(
        makeLedgerAppResponseError({ returnCode: 0x6984, errorMessage: 'Data is invalid' })
      )
    ).toMatchObject({ kind: 'invalid-payload', message: 'Data is invalid' });
  });

  test('falls back to an unknown error that keeps the message and cause', () => {
    const appError = makeLedgerAppResponseError({ returnCode: 0x6f00, errorMessage: 'Unknown' });

    expect(toHardwareWalletError(appError)).toMatchObject({
      kind: 'unknown',
      message: 'Unknown',
      cause: appError,
    });
    expect(toHardwareWalletError('boom').kind).toBe('unknown');
  });
});

describe(withLedgerErrors.name, () => {
  test('passes results through and maps failures', async () => {
    const succeed = withLedgerErrors((value: number) => Promise.resolve(value * 2));
    const fail = withLedgerErrors(() => Promise.reject(makeNamedError('LockedDeviceError')));

    await expect(succeed(2)).resolves.toBe(4);
    await expect(fail()).rejects.toMatchObject({ kind: 'locked' });
  });
});
