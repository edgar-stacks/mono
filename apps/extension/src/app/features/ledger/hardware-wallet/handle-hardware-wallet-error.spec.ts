import { entries } from 'remeda';

import {
  HardwareWalletError,
  type HardwareWalletErrorKind,
  hardwareWalletErrorKinds,
} from '@leather.io/ledger';

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

type Navigate = ReturnType<typeof makeNavigate>;

function dispatch(error: unknown) {
  const ledgerNavigate = makeNavigate();
  const setLatestDeviceResponse = vi.fn();
  handleHardwareWalletError(error, { chain: 'bitcoin', ledgerNavigate, setLatestDeviceResponse });
  return { ledgerNavigate, setLatestDeviceResponse };
}

function calledSteps(ledgerNavigate: Navigate) {
  return entries(ledgerNavigate)
    .filter(([, step]) => step.mock.calls.length > 0)
    .map(([name]) => name);
}

describe(handleHardwareWalletError.name, () => {
  const expectedSteps: Record<HardwareWalletErrorKind, [keyof Navigate, unknown[]] | null> = {
    cancelled: null,
    locked: ['toConnectStep', []],
    disconnected: ['toDeviceDisconnectStep', []],
    rejected: ['toOperationRejectedStep', []],
    'not-paired': ['toPairDeviceStep', []],
    'invalid-payload': ['toDevicePayloadInvalid', []],
    'outdated-app': ['toStacksAppOutdatedWarning', [undefined]],
    unknown: ['toErrorStep', ['bitcoin']],
    'no-device-selected': ['toErrorStep', ['bitcoin', 'no-device-selected message']],
    busy: ['toErrorStep', ['bitcoin', 'busy message']],
    'wrong-app': ['toErrorStep', ['bitcoin', 'wrong-app message']],
    unsupported: ['toErrorStep', ['bitcoin', 'unsupported message']],
  };

  test.each(hardwareWalletErrorKinds)('routes %s to its flow step', kind => {
    const expected = expectedSteps[kind];
    const { ledgerNavigate } = dispatch(new HardwareWalletError(kind, `${kind} message`));

    if (!expected) {
      expect(calledSteps(ledgerNavigate)).toEqual([]);
      return;
    }
    const [step, args] = expected;
    expect(calledSteps(ledgerNavigate)).toEqual([step]);
    expect(ledgerNavigate[step]).toHaveBeenCalledWith(...args);
  });

  test('marks the device locked before returning to the connect step', () => {
    const { setLatestDeviceResponse } = dispatch(new HardwareWalletError('locked'));

    expect(setLatestDeviceResponse).toHaveBeenCalledWith({ deviceLocked: true });
  });

  test('passes the outdated app versions to the warning step', () => {
    const details = { currentVersion: '0.24.0', requiredVersion: '0.26.19' };
    const { ledgerNavigate } = dispatch(
      new HardwareWalletError('outdated-app', 'Outdated', { details })
    );

    expect(ledgerNavigate.toStacksAppOutdatedWarning).toHaveBeenCalledWith(details);
  });

  test('routes errors from outside the contract to the generic error step', () => {
    const { ledgerNavigate, setLatestDeviceResponse } = dispatch(new Error('boom'));

    expect(calledSteps(ledgerNavigate)).toEqual(['toErrorStep']);
    expect(ledgerNavigate.toErrorStep).toHaveBeenCalledWith('bitcoin');
    expect(setLatestDeviceResponse).not.toHaveBeenCalled();
  });
});
