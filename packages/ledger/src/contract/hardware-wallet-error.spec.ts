import {
  HardwareWalletError,
  hardwareWalletErrorKinds,
  isHardwareWalletError,
  throwIfAborted,
} from './hardware-wallet-error';

function getThrownError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe(HardwareWalletError.name, () => {
  test.each(hardwareWalletErrorKinds)('gives the %s kind a default message', kind => {
    const error = new HardwareWalletError(kind);

    expect(error.kind).toBe(kind);
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.details).toBeNull();
  });

  test('keeps the message, cause and outdated app details', () => {
    const cause = new Error('device');
    const details = { currentVersion: '0.24.0', requiredVersion: '0.26.19' };

    const error = new HardwareWalletError('outdated-app', 'Update the app', { cause, details });

    expect(error.message).toBe('Update the app');
    expect(error.cause).toBe(cause);
    expect(error.details).toEqual(details);
  });
});

describe(isHardwareWalletError.name, () => {
  test('matches only hardware wallet errors', () => {
    expect(isHardwareWalletError(new HardwareWalletError('locked'))).toBe(true);
    expect(isHardwareWalletError(new Error('locked'))).toBe(false);
    expect(isHardwareWalletError({ kind: 'locked' })).toBe(false);
  });
});

describe(throwIfAborted.name, () => {
  test('throws a cancelled error once the signal is aborted', () => {
    const controller = new AbortController();
    expect(() => throwIfAborted(controller.signal)).not.toThrow();

    controller.abort();

    expect(getThrownError(() => throwIfAborted(controller.signal))).toMatchObject({
      kind: 'cancelled',
    });
  });
});
