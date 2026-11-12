import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import {
  type HardwareWalletConnector,
  HardwareWalletError,
  type HardwareWalletInteraction,
  type HardwareWalletSession,
} from '@leather.io/ledger';
import {
  makeFakeHardwareBitcoinSigner,
  makeFakeHardwareWallet,
  makeFakeHardwareWalletConnector,
} from '@leather.io/ledger/test-utils';
import type * as LeatherUtils from '@leather.io/utils';

import { useHardwareWalletOperation } from './use-hardware-wallet-operation';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const mocks = vi.hoisted(() => ({
  connector: vi.fn<() => HardwareWalletConnector>(),
  delays: new Array<number>(),
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

vi.mock('./hardware-wallet.context', () => ({
  useHardwareWalletConnector: () => mocks.connector(),
}));

vi.mock('@app/store/networks/networks.selectors', () => ({
  useCurrentNetwork: () => ({ chain: { bitcoin: { mode: 'testnet' } } }),
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
  useLedgerFlowState: () => null,
}));

vi.mock('@leather.io/utils', async importOriginal => {
  const actual = await importOriginal<typeof LeatherUtils>();
  return {
    ...actual,
    delay(ms: number) {
      mocks.delays.push(ms);
      return Promise.resolve();
    },
  };
});

function withAbortSignal(): unknown {
  const anyAbortSignal: unknown = expect.any(AbortSignal);
  return expect.objectContaining({ signal: anyAbortSignal });
}

type HookArgs = Parameters<typeof useHardwareWalletOperation>[0];

function renderOperation(args: HookArgs) {
  let value: ReturnType<typeof useHardwareWalletOperation> | undefined;
  function TestComponent() {
    value = useHardwareWalletOperation(args);
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => {
    root.render(createElement(TestComponent));
  });
  return function getValue() {
    if (!value) throw new Error('Hook did not render a value');
    return value;
  };
}

function setup(args: HookArgs = { chain: 'bitcoin' }) {
  const session = makeFakeHardwareWallet({ bitcoin: makeFakeHardwareBitcoinSigner() });
  const connector = makeFakeHardwareWalletConnector(session);
  mocks.connector.mockReturnValue(connector);
  return { session, connector, getValue: renderOperation(args) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.delays.length = 0;
});

describe(useHardwareWalletOperation.name, () => {
  test('connects for the current Bitcoin network and runs the operation on the wallet', async () => {
    const { session, connector, getValue } = setup();
    const operation = vi.fn().mockResolvedValue(undefined);

    await act(() => getValue().run(operation));

    expect(connector.connect).toHaveBeenCalledWith(
      { chain: 'bitcoin', network: 'testnet' },
      withAbortSignal()
    );
    expect(operation).toHaveBeenCalledWith(session, withAbortSignal());
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('connects to the Stacks app for Stacks operations', async () => {
    const { connector, getValue } = setup({ chain: 'stacks' });

    await act(() => getValue().run(vi.fn().mockResolvedValue(undefined)));

    expect(connector.connect).toHaveBeenCalledWith({ chain: 'stacks' }, expect.anything());
  });

  test('shows the checking-app-version step, then connection success for 1250ms before the operation', async () => {
    const { getValue } = setup();
    const order: string[] = [];
    mocks.toCheckingAppVersion.mockImplementation(() => order.push('checking-app-version'));
    mocks.toConnectionSuccessStep.mockImplementation(() => order.push('connection-success'));

    await act(() =>
      getValue().run(() => {
        order.push('operation');
        return Promise.resolve();
      })
    );

    expect(order).toEqual(['checking-app-version', 'connection-success', 'operation']);
    expect(mocks.toConnectionSuccessStep).toHaveBeenCalledWith('bitcoin');
    expect(mocks.delays).toEqual([1000, 1250]);
  });

  test('waits the configured time on the checking-app-version step', async () => {
    const { getValue } = setup({ chain: 'bitcoin', checkingAppVersionDelayMs: 500 });

    await act(() => getValue().run(vi.fn().mockResolvedValue(undefined)));

    expect(mocks.delays).toEqual([500, 1250]);
  });

  test('tracks a locked device and a cancellable connection while connecting', async () => {
    const { connector, getValue } = setup();
    const pendingConnection: { resolve?(session: HardwareWalletSession): void } = {};
    connector.connect.mockImplementation(
      (_request, ctx) =>
        new Promise(resolve => {
          ctx.onInteraction?.({ type: 'unlock-device' });
          pendingConnection.resolve = resolve;
        })
    );

    let running: Promise<void> = Promise.resolve();
    act(() => {
      running = getValue().run(vi.fn().mockResolvedValue(undefined));
    });

    expect(getValue().awaitingDeviceConnection).toBe(true);
    expect(getValue().isConnectionCancellable).toBe(true);
    expect(getValue().latestDeviceResponse).toEqual({ deviceLocked: true });

    await act(async () => {
      pendingConnection.resolve?.(makeFakeHardwareWallet());
      await running;
    });

    expect(getValue().awaitingDeviceConnection).toBe(false);
    expect(getValue().isConnectionCancellable).toBe(false);
  });

  test('forwards interactions during the operation to the caller', async () => {
    const onInteraction = vi.fn();
    const { getValue } = setup({ chain: 'bitcoin', onInteraction });
    const interaction: HardwareWalletInteraction = { type: 'approve-policy' };

    await act(() =>
      getValue().run((_wallet, ctx) => {
        ctx.onInteraction?.(interaction);
        return Promise.resolve();
      })
    );

    expect(onInteraction).toHaveBeenCalledWith(interaction);
    expect(getValue().latestDeviceResponse).toEqual({ deviceLocked: false });
  });

  test('aborts the running operation on cancel and stays silent', async () => {
    const { session, getValue } = setup();
    let signal: AbortSignal | undefined;

    await act(() =>
      getValue().run((_wallet, ctx) => {
        signal = ctx.signal;
        getValue().cancel();
        if (ctx.signal.aborted) return Promise.reject(new HardwareWalletError('cancelled'));
        return Promise.resolve();
      })
    );

    expect(signal?.aborted).toBe(true);
    expect(session.close).toHaveBeenCalledOnce();
    expect(mocks.toErrorStep).not.toHaveBeenCalled();
    expect(mocks.toConnectStep).not.toHaveBeenCalled();
  });

  test('returns to the connect step with the locked warning when the device is locked', async () => {
    const { connector, getValue } = setup();
    connector.connect.mockRejectedValue(new HardwareWalletError('locked'));

    await act(() => getValue().run(vi.fn()));

    expect(getValue().latestDeviceResponse).toEqual({ deviceLocked: true });
    expect(getValue().awaitingDeviceConnection).toBe(false);
    expect(mocks.toConnectStep).toHaveBeenCalledOnce();
  });

  test('opens the outdated Stacks app warning with the version details', async () => {
    const { connector, getValue } = setup({ chain: 'stacks' });
    const details = { currentVersion: '0.26.0', requiredVersion: '0.26.19' };
    connector.connect.mockRejectedValue(
      new HardwareWalletError('outdated-app', undefined, { details })
    );
    const operation = vi.fn();

    await act(() => getValue().run(operation));

    expect(mocks.toStacksAppOutdatedWarning).toHaveBeenCalledWith(details);
    expect(mocks.toConnectionSuccessStep).not.toHaveBeenCalled();
    expect(operation).not.toHaveBeenCalled();
  });

  test('handles a failing operation and closes the session', async () => {
    const { session, getValue } = setup();

    await act(() => getValue().run(() => Promise.reject(new HardwareWalletError('disconnected'))));

    expect(mocks.toDeviceDisconnectStep).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('sends the user to pair a device when none is paired', async () => {
    const { connector, getValue } = setup();
    connector.connect.mockRejectedValue(new HardwareWalletError('not-paired'));

    await act(() => getValue().run(vi.fn()));

    expect(mocks.toPairDeviceStep).toHaveBeenCalledOnce();
  });
});
