import {
  HardwareWalletError,
  hardwareWalletErrorKinds,
  isHardwareWalletErrorKind,
  throwIfOperationAborted,
} from './hardware-wallet-error';

function captureError(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe(HardwareWalletError.name, () => {
  test.each(hardwareWalletErrorKinds)('gives the %s kind a default message', kind => {
    const error = new HardwareWalletError(kind);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HardwareWalletError');
    expect(error.kind).toBe(kind);
    expect(error.message.length).toBeGreaterThan(0);
  });

  test('keeps the message, details and cause it is given', () => {
    const cause = new Error('device said no');
    const error = new HardwareWalletError('outdated-app', 'Update the app', {
      details: { currentVersion: '0.1.0', requiredVersion: '0.2.0' },
      cause,
    });

    expect(error.message).toBe('Update the app');
    expect(error.details).toEqual({ currentVersion: '0.1.0', requiredVersion: '0.2.0' });
    expect(error.cause).toBe(cause);
  });
});

describe(isHardwareWalletErrorKind.name, () => {
  test('matches only hardware wallet errors of the given kind', () => {
    expect(isHardwareWalletErrorKind(new HardwareWalletError('locked'), 'locked')).toBe(true);
    expect(isHardwareWalletErrorKind(new HardwareWalletError('busy'), 'locked')).toBe(false);
    expect(isHardwareWalletErrorKind(new Error('locked'), 'locked')).toBe(false);
  });
});

describe(throwIfOperationAborted.name, () => {
  test('throws a cancelled error only once the signal has aborted', () => {
    const controller = new AbortController();

    expect(() => throwIfOperationAborted(undefined)).not.toThrow();
    expect(() => throwIfOperationAborted(controller.signal)).not.toThrow();
    controller.abort();
    expect(captureError(() => throwIfOperationAborted(controller.signal))).toMatchObject({
      kind: 'cancelled',
    });
  });
});
