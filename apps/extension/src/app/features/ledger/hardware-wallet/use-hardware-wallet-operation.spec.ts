// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import {
  type ConnectRequest,
  HardwareWalletError,
  type HardwareWalletInteraction,
  type OperationContext,
} from '@leather.io/ledger';
import {
  makeFakeHardwareBitcoinSigner,
  makeFakeHardwareWallet,
  makeFakeHardwareWalletConnector,
  makeFakeHardwareWalletSession,
} from '@leather.io/ledger/test-utils';
import type * as LeatherUtils from '@leather.io/utils';

import { useHardwareWalletOperation } from './use-hardware-wallet-operation';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  delay: vi.fn(),
  toCheckingAppVersion: vi.fn(),
  toConnectStep: vi.fn(),
  toConnectionSuccessStep: vi.fn(),
  toErrorStep: vi.fn(),
  toDeviceDisconnectStep: vi.fn(),
  toOperationRejectedStep: vi.fn(),
  toPairDeviceStep: vi.fn(),
  toDevicePayloadInvalid: vi.fn(),
  toStacksAppOutdatedWarning: vi.fn(),
}));

vi.mock('@leather.io/bitcoin', () => ({
  makeNativeSegwitAccountDerivationPath: vi.fn(),
  makeTaprootAccountDerivationPath: vi.fn(),
}));

vi.mock('../flow/ledger-flow.context', () => ({
  useLedgerSteps: () => ({
    toCheckingAppVersion: mocks.toCheckingAppVersion,
    toConnectStep: mocks.toConnectStep,
    toConnectionSuccessStep: mocks.toConnectionSuccessStep,
    toErrorStep: mocks.toErrorStep,
    toDeviceDisconnectStep: mocks.toDeviceDisconnectStep,
    toOperationRejectedStep: mocks.toOperationRejectedStep,
    toPairDeviceStep: mocks.toPairDeviceStep,
    toDevicePayloadInvalid: mocks.toDevicePayloadInvalid,
    toStacksAppOutdatedWarning: mocks.toStacksAppOutdatedWarning,
  }),
}));

vi.mock('./hardware-wallet.context', () => ({
  useHardwareWalletConnector: () => makeFakeHardwareWalletConnector({ connect: mocks.connect }),
}));

vi.mock('@leather.io/utils', async importOriginal => {
  const actual = await importOriginal<typeof LeatherUtils>();
  return { ...actual, delay: mocks.delay };
});

const bitcoinRequest: ConnectRequest = { chain: 'bitcoin', network: 'mainnet' };

function renderHookValue<T>(useHook: () => T) {
  let value: T | undefined;
  function TestComponent() {
    value = useHook();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => {
    root.render(createElement(TestComponent));
  });
  return {
    getValue(): T {
      if (value === undefined) throw new Error('Hook did not render a value');
      return value;
    },
  };
}

function setup() {
  const session = makeFakeHardwareWalletSession(
    makeFakeHardwareWallet({ bitcoin: makeFakeHardwareBitcoinSigner() })
  );
  mocks.connect.mockResolvedValue(session);
  return { session, hook: renderHookValue(() => useHardwareWalletOperation('bitcoin')) };
}

function anyAbortSignal(): unknown {
  return expect.any(AbortSignal);
}

describe(useHardwareWalletOperation.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.delay.mockResolvedValue(undefined);
  });

  test('connects, shows the app check and connection success steps, then runs the operation', async () => {
    const { session, hook } = setup();
    const operation = vi.fn().mockResolvedValue('signed');

    let result: unknown;
    await act(async () => {
      result = await hook.getValue().run(bitcoinRequest, operation);
    });

    expect(result).toBe('signed');
    expect(mocks.connect).toHaveBeenCalledWith(bitcoinRequest, expect.anything());
    expect(mocks.toCheckingAppVersion).toHaveBeenCalledOnce();
    expect(mocks.toConnectionSuccessStep).toHaveBeenCalledWith('bitcoin');
    expect(mocks.delay).toHaveBeenLastCalledWith(1250);
    expect(operation).toHaveBeenCalledWith(session, { signal: anyAbortSignal() });
    expect(mocks.toCheckingAppVersion.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.toConnectionSuccessStep.mock.invocationCallOrder[0]
    );
    expect(mocks.toConnectionSuccessStep.mock.invocationCallOrder[0]).toBeLessThan(
      operation.mock.invocationCallOrder[0]
    );
    expect(session.close).toHaveBeenCalledOnce();
    expect(hook.getValue().awaitingDeviceConnection).toBe(false);
  });

  test.each<[HardwareWalletInteraction, boolean, boolean]>([
    [{ type: 'unlock-device' }, true, true],
    [{ type: 'open-app', appName: 'Bitcoin' }, false, true],
    [{ type: 'none' }, false, false],
  ])(
    'reports the %o connection interaction to the connect step',
    async (interaction, deviceLocked, isConnectionCancellable) => {
      const { hook } = setup();
      let finishConnecting: (() => void) | undefined;
      mocks.connect.mockImplementation(
        (_request: ConnectRequest, ctx: OperationContext) =>
          new Promise((_resolve, reject) => {
            ctx.onInteraction?.(interaction);
            finishConnecting = () => reject(new HardwareWalletError('cancelled'));
          })
      );

      let running: Promise<unknown> | undefined;
      act(() => {
        running = hook.getValue().run(bitcoinRequest, vi.fn());
      });

      expect(hook.getValue().latestDeviceResponse).toEqual({ deviceLocked });
      expect(hook.getValue().isConnectionCancellable).toBe(isConnectionCancellable);
      expect(hook.getValue().awaitingDeviceConnection).toBe(true);

      await act(async () => {
        finishConnecting?.();
        await running;
      });
      expect(hook.getValue().isConnectionCancellable).toBe(false);
    }
  );

  test('routes a failure through the error handler and resolves without a result', async () => {
    const { hook } = setup();
    mocks.connect.mockRejectedValue(new HardwareWalletError('not-paired'));
    const operation = vi.fn();

    let result: unknown = 'unset';
    await act(async () => {
      result = await hook.getValue().run(bitcoinRequest, operation);
    });

    expect(result).toBeUndefined();
    expect(operation).not.toHaveBeenCalled();
    expect(mocks.toPairDeviceStep).toHaveBeenCalledOnce();
    expect(hook.getValue().awaitingDeviceConnection).toBe(false);
  });

  test('marks the device locked and returns to the connect step when it is locked', async () => {
    const { hook } = setup();
    mocks.connect.mockRejectedValue(new HardwareWalletError('locked'));

    await act(async () => {
      await hook.getValue().run(bitcoinRequest, vi.fn());
    });

    expect(hook.getValue().latestDeviceResponse).toEqual({ deviceLocked: true });
    expect(mocks.toConnectStep).toHaveBeenCalledOnce();
  });

  test('closes the session and handles the error when the operation fails', async () => {
    const { hook, session } = setup();

    await act(async () => {
      await hook
        .getValue()
        .run(bitcoinRequest, vi.fn().mockRejectedValue(new HardwareWalletError('rejected')));
    });

    expect(mocks.toOperationRejectedStep).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('aborts the running operation on cancel without navigating', async () => {
    const { hook, session } = setup();
    const operation = vi.fn(
      (_wallet: unknown, { signal }: OperationContext) =>
        new Promise<never>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new HardwareWalletError('cancelled')));
        })
    );

    let running: Promise<unknown> | undefined;
    await act(async () => {
      running = hook.getValue().run(bitcoinRequest, operation);
      await vi.waitFor(() => expect(operation).toHaveBeenCalled());
    });
    await act(async () => {
      hook.getValue().cancel();
      await running;
    });

    expect(session.close).toHaveBeenCalledOnce();
    expect(mocks.toErrorStep).not.toHaveBeenCalled();
    expect(mocks.toOperationRejectedStep).not.toHaveBeenCalled();
  });
});
