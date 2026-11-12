import { HardwareWalletError, hardwareWalletErrorKinds } from '@leather.io/ledger';

import { handleHardwareWalletError } from './handle-hardware-wallet-error';

function makeNavigate() {
  return {
    toConnectStep: vi.fn(),
    toErrorStep: vi.fn(),
    toDeviceDisconnectStep: vi.fn(),
    toOperationRejectedStep: vi.fn(),
    toPairDeviceStep: vi.fn(),
    toDevicePayloadInvalid: vi.fn(),
    toStacksAppOutdatedWarning: vi.fn(),
  };
}

function dispatch(error: unknown) {
  const ledgerNavigate = makeNavigate();
  const setLatestDeviceResponse = vi.fn();
  handleHardwareWalletError(error, { chain: 'bitcoin', ledgerNavigate, setLatestDeviceResponse });
  return { ledgerNavigate, setLatestDeviceResponse };
}

function navigationCalls(ledgerNavigate: ReturnType<typeof makeNavigate>) {
  return Object.entries(ledgerNavigate).flatMap(([step, fn]) =>
    fn.mock.calls.map((args: unknown[]) => [step, ...args])
  );
}

const expectedNavigation = {
  cancelled: [],
  locked: [['toConnectStep']],
  disconnected: [['toDeviceDisconnectStep']],
  rejected: [['toOperationRejectedStep']],
  'not-paired': [['toPairDeviceStep']],
  'no-device-selected': [['toErrorStep', 'bitcoin', 'Pick a device']],
  busy: [['toErrorStep', 'bitcoin', 'Pick a device']],
  'wrong-app': [['toErrorStep', 'bitcoin', 'Pick a device']],
  'outdated-app': [
    ['toStacksAppOutdatedWarning', { currentVersion: '0.26.0', requiredVersion: '0.26.19' }],
  ],
  'invalid-payload': [['toDevicePayloadInvalid']],
  unsupported: [['toErrorStep', 'bitcoin', 'Pick a device']],
  unknown: [['toErrorStep', 'bitcoin']],
} satisfies Record<(typeof hardwareWalletErrorKinds)[number], unknown[][]>;

describe(handleHardwareWalletError.name, () => {
  test.each(hardwareWalletErrorKinds)('maps the %s error kind to its flow step', kind => {
    const { ledgerNavigate } = dispatch(
      new HardwareWalletError(kind, 'Pick a device', {
        details: { currentVersion: '0.26.0', requiredVersion: '0.26.19' },
      })
    );

    expect(navigationCalls(ledgerNavigate)).toEqual(expectedNavigation[kind]);
  });

  test('marks the device locked before returning to the connect step', () => {
    const { setLatestDeviceResponse } = dispatch(new HardwareWalletError('locked'));

    expect(setLatestDeviceResponse).toHaveBeenCalledWith({ deviceLocked: true });
  });

  test('leaves the device state alone for any other kind', () => {
    const { setLatestDeviceResponse } = dispatch(new HardwareWalletError('disconnected'));

    expect(setLatestDeviceResponse).not.toHaveBeenCalled();
  });

  test('opens the outdated app warning without details when there are none', () => {
    const { ledgerNavigate } = dispatch(new HardwareWalletError('outdated-app'));

    expect(ledgerNavigate.toStacksAppOutdatedWarning).toHaveBeenCalledWith(undefined);
  });

  test('routes errors that are not hardware wallet errors to the generic error step', () => {
    const { ledgerNavigate } = dispatch(new Error('No native segwit account available'));

    expect(navigationCalls(ledgerNavigate)).toEqual([['toErrorStep', 'bitcoin']]);
  });
});
