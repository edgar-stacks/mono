import {
  HardwareWalletError,
  hardwareWalletErrorKinds,
  isHardwareWalletError,
  throwIfOperationAborted,
} from './hardware-wallet-error';

describe(HardwareWalletError.name, () => {
  test.each(hardwareWalletErrorKinds)('gives the %s kind a default message', kind => {
    const error = new HardwareWalletError(kind);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HardwareWalletError');
    expect(error.kind).toBe(kind);
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.details).toBeNull();
  });

  test('keeps the message, details and cause it was given', () => {
    const cause = new Error('device said no');
    const details = { currentVersion: '0.26.0', requiredVersion: '0.26.19' };

    const error = new HardwareWalletError('outdated-app', 'Update the app', { details, cause });

    expect(error.message).toBe('Update the app');
    expect(error.details).toEqual(details);
    expect(error.cause).toBe(cause);
  });
});

describe(isHardwareWalletError.name, () => {
  test('recognises hardware wallet errors only', () => {
    expect(isHardwareWalletError(new HardwareWalletError('locked'))).toBe(true);
    expect(isHardwareWalletError(new Error('locked'))).toBe(false);
    expect(isHardwareWalletError({ kind: 'locked' })).toBe(false);
  });
});

describe(throwIfOperationAborted.name, () => {
  test('throws a cancelled error once the signal is aborted', () => {
    const controller = new AbortController();

    expect(() => throwIfOperationAborted(controller.signal)).not.toThrow();
    controller.abort();
    expect(() => throwIfOperationAborted(controller.signal)).toThrow(HardwareWalletError);
    expect(() => throwIfOperationAborted(controller.signal)).toThrow(
      'The hardware wallet operation was cancelled'
    );
  });
});
