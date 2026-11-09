import { HardwareWalletError, hardwareWalletErrorKinds } from '@leather.io/ledger';

import { handleHardwareWalletError } from './handle-hardware-wallet-error';

function dispatch(error: unknown) {
  const ledgerNavigate = {
    toConnectStep: vi.fn(),
    toErrorStep: vi.fn(),
    toDeviceDisconnectStep: vi.fn(),
    toOperationRejectedStep: vi.fn(),
    toPairDeviceStep: vi.fn(),
    toDevicePayloadInvalid: vi.fn(),
    toStacksAppOutdatedWarning: vi.fn(),
  };
  const setLatestDeviceResponse = vi.fn();
  handleHardwareWalletError(error, { chain: 'bitcoin', ledgerNavigate, setLatestDeviceResponse });
  const navigatedSteps = Object.entries(ledgerNavigate)
    .filter(([, step]) => step.mock.calls.length > 0)
    .map(([name]) => name);
  return { ledgerNavigate, setLatestDeviceResponse, navigatedSteps };
}

describe(handleHardwareWalletError.name, () => {
  test('does nothing for a cancelled operation', () => {
    const { navigatedSteps, setLatestDeviceResponse } = dispatch(
      new HardwareWalletError('cancelled')
    );

    expect(navigatedSteps).toEqual([]);
    expect(setLatestDeviceResponse).not.toHaveBeenCalled();
  });

  test('marks the device locked and returns to the connect step', () => {
    const { ledgerNavigate, navigatedSteps, setLatestDeviceResponse } = dispatch(
      new HardwareWalletError('locked')
    );

    expect(setLatestDeviceResponse).toHaveBeenCalledWith({ deviceLocked: true });
    expect(ledgerNavigate.toConnectStep).toHaveBeenCalledOnce();
    expect(navigatedSteps).toEqual(['toConnectStep']);
  });

  test.each([
    ['disconnected', 'toDeviceDisconnectStep'],
    ['rejected', 'toOperationRejectedStep'],
    ['not-paired', 'toPairDeviceStep'],
    ['invalid-payload', 'toDevicePayloadInvalid'],
  ] as const)('routes %s errors to the %s step', (kind, step) => {
    const { ledgerNavigate, navigatedSteps } = dispatch(new HardwareWalletError(kind));

    expect(ledgerNavigate[step]).toHaveBeenCalledOnce();
    expect(navigatedSteps).toEqual([step]);
  });

  test('shows the Stacks app outdated warning with the versions', () => {
    const { ledgerNavigate } = dispatch(
      new HardwareWalletError('outdated-app', undefined, {
        details: { currentVersion: '0.26.17', requiredVersion: '0.26.19' },
      })
    );

    expect(ledgerNavigate.toStacksAppOutdatedWarning).toHaveBeenCalledWith({
      currentVersion: '0.26.17',
      requiredVersion: '0.26.19',
    });
  });

  test('shows the Stacks app outdated warning without versions it does not know', () => {
    const { ledgerNavigate } = dispatch(new HardwareWalletError('outdated-app'));

    expect(ledgerNavigate.toStacksAppOutdatedWarning).toHaveBeenCalledWith(undefined);
  });

  test.each(['no-device-selected', 'busy', 'wrong-app', 'unsupported'] as const)(
    'shows the error step with the message of %s errors',
    kind => {
      const error = new HardwareWalletError(kind, `A ${kind} message`);
      const { ledgerNavigate, navigatedSteps } = dispatch(error);

      expect(ledgerNavigate.toErrorStep).toHaveBeenCalledWith('bitcoin', error.message);
      expect(navigatedSteps).toEqual(['toErrorStep']);
    }
  );

  test('shows the generic error step for unknown errors', () => {
    const { ledgerNavigate } = dispatch(new HardwareWalletError('unknown', 'boom'));

    expect(ledgerNavigate.toErrorStep).toHaveBeenCalledWith('bitcoin');
  });

  test('shows the generic error step for errors that are not hardware wallet errors', () => {
    const { ledgerNavigate } = dispatch(new Error('boom'));

    expect(ledgerNavigate.toErrorStep).toHaveBeenCalledWith('bitcoin');
  });

  test.each(hardwareWalletErrorKinds)('handles the %s kind', kind => {
    const { navigatedSteps } = dispatch(new HardwareWalletError(kind));

    expect(navigatedSteps.length).toBe(kind === 'cancelled' ? 0 : 1);
  });
});
