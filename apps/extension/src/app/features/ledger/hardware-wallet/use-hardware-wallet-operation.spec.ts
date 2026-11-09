// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';

import {
  HardwareWalletError,
  type HardwareWalletSession,
  type OperationContext,
} from '@leather.io/ledger';
import {
  makeFakeHardwareWalletConnector,
  makeFakeHardwareWalletSession,
} from '@leather.io/ledger/test-utils';
import type * as LeatherUtils from '@leather.io/utils';

import { useHardwareWalletOperation } from './use-hardware-wallet-operation';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  delay: vi.fn(),
  toCheckingAppVersion: vi.fn(),
  toConnectionSuccessStep: vi.fn(),
  toConnectStep: vi.fn(),
  toErrorStep: vi.fn(),
  toDeviceDisconnectStep: vi.fn(),
  toOperationRejectedStep: vi.fn(),
  toPairDeviceStep: vi.fn(),
  toDevicePayloadInvalid: vi.fn(),
  toStacksAppOutdatedWarning: vi.fn(),
}));

vi.mock('@leather.io/bitcoin', () => ({}));

vi.mock('@leather.io/utils', async importOriginal => {
  const actual = await importOriginal<typeof LeatherUtils>();
  return { ...actual, delay: mocks.delay };
});

vi.mock('../flow/ledger-flow.context', () => ({
  useLedgerFlowState: () => null,
  useLedgerSteps: () => ({
    toCheckingAppVersion: mocks.toCheckingAppVersion,
    toConnectionSuccessStep: mocks.toConnectionSuccessStep,
    toConnectStep: mocks.toConnectStep,
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

const stacksRequest = { chain: 'stacks' } as const;

function connectWith(session: HardwareWalletSession = makeFakeHardwareWalletSession()) {
  mocks.connect.mockResolvedValue(session);
  return session;
}

describe(useHardwareWalletOperation.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.delay.mockResolvedValue(undefined);
  });

  test('shows the app check and connection success before running the operation', async () => {
    const session = connectWith();
    const steps: string[] = [];
    mocks.toCheckingAppVersion.mockImplementation(() => steps.push('checking-app-version'));
    mocks.toConnectionSuccessStep.mockImplementation(() => steps.push('connection-success'));
    const operation = vi.fn(() => {
      steps.push('operation');
      return Promise.resolve('done');
    });
    const { result } = renderHook(() => useHardwareWalletOperation({ chain: 'stacks' }));

    let value: string | undefined;
    await act(async () => {
      value = await result.current.run(stacksRequest, operation);
    });

    expect(value).toBe('done');
    expect(steps).toEqual(['checking-app-version', 'connection-success', 'operation']);
    expect(mocks.toConnectionSuccessStep).toHaveBeenCalledWith('stacks');
    expect(mocks.delay.mock.calls).toEqual([[1000], [1250]]);
    expect(operation).toHaveBeenCalledWith(session.wallet, expect.anything());
    expect(session.close).toHaveBeenCalledOnce();
    expect(result.current.awaitingDeviceConnection).toBe(false);
  });

  test('keeps the shorter app check for transaction signing', async () => {
    connectWith();
    const { result } = renderHook(() =>
      useHardwareWalletOperation({ chain: 'bitcoin', checkingAppVersionDelay: 500 })
    );

    await act(async () => {
      await result.current.run({ chain: 'bitcoin', network: 'mainnet' }, () => Promise.resolve());
    });

    expect(mocks.delay.mock.calls).toEqual([[500], [1250]]);
  });

  test('tracks the lock state while connecting and forwards later interactions', async () => {
    const onInteraction = vi.fn();
    const pendingConnect: { resolve?(session: HardwareWalletSession): void } = {};
    let connectCtx: OperationContext | undefined;
    mocks.connect.mockImplementation((_request, ctx: OperationContext) => {
      connectCtx = ctx;
      return new Promise<HardwareWalletSession>(resolve => {
        pendingConnect.resolve = resolve;
      });
    });
    const { result } = renderHook(() => useHardwareWalletOperation({ chain: 'stacks' }));

    let running: Promise<unknown> = Promise.resolve();
    act(() => {
      running = result.current.run(
        stacksRequest,
        (_wallet, ctx) => {
          ctx.onInteraction?.({ type: 'confirm-on-device' });
          return Promise.resolve();
        },
        { onInteraction }
      );
    });
    act(() => connectCtx?.onInteraction?.({ type: 'unlock-device' }));

    expect(result.current.awaitingDeviceConnection).toBe(true);
    expect(result.current.latestDeviceResponse).toEqual({ deviceLocked: true });
    expect(result.current.isConnectionCancellable).toBe(true);

    await act(async () => {
      pendingConnect.resolve?.(makeFakeHardwareWalletSession());
      await running;
    });

    expect(result.current.isConnectionCancellable).toBe(false);
    expect(onInteraction).toHaveBeenCalledOnce();
    expect(onInteraction).toHaveBeenCalledWith({ type: 'confirm-on-device' });
  });

  test('routes errors to their flow step and resolves without a result', async () => {
    mocks.connect.mockRejectedValue(new HardwareWalletError('locked'));
    const { result } = renderHook(() => useHardwareWalletOperation({ chain: 'stacks' }));

    let value: unknown = 'unset';
    await act(async () => {
      value = await result.current.run(stacksRequest, () => Promise.resolve('done'));
    });

    expect(value).toBeUndefined();
    expect(mocks.toConnectStep).toHaveBeenCalledOnce();
    expect(result.current.latestDeviceResponse).toEqual({ deviceLocked: true });
    expect(mocks.toCheckingAppVersion).not.toHaveBeenCalled();
  });

  test('aborts the running operation on cancel without navigating and closes the session', async () => {
    const session = connectWith();
    let operationCtx: OperationContext | undefined;
    const { result } = renderHook(() => useHardwareWalletOperation({ chain: 'stacks' }));

    let running: Promise<unknown> = Promise.resolve();
    await act(async () => {
      running = result.current.run(stacksRequest, (_wallet, ctx) => {
        operationCtx = ctx;
        return new Promise<never>(() => undefined);
      });
      await vi.waitFor(() => expect(operationCtx).toBeDefined());
    });

    await act(async () => {
      result.current.cancel();
      await running;
    });

    expect(operationCtx?.signal.aborted).toBe(true);
    expect(session.close).toHaveBeenCalledOnce();
    expect(mocks.toErrorStep).not.toHaveBeenCalled();
    expect(mocks.toConnectStep).not.toHaveBeenCalled();
  });
});
