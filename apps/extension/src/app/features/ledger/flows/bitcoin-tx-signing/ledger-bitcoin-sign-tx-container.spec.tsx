import * as btc from '@scure/btc-signer';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { type HardwareWalletConnector, HardwareWalletError } from '@leather.io/ledger';
import {
  makeFakeHardwareBitcoinSigner,
  makeFakeHardwareWallet,
  makeFakeHardwareWalletConnector,
} from '@leather.io/ledger/test-utils';
import type * as LeatherUtils from '@leather.io/utils';

import type { LedgerSigningOutcome } from '@app/features/ledger/flow/ledger-flow.types';
import type { LedgerTxSigningContext } from '@app/features/ledger/generic-flows/tx-signing/ledger-sign-tx.context';
import type * as GenericLedgerUtils from '@app/features/ledger/utils/generic-ledger-utils';

import { LedgerSignBitcoinTxContainer } from './ledger-bitcoin-sign-tx-container';

const mocks = vi.hoisted(() => ({
  connector: vi.fn<() => HardwareWalletConnector>(),
  toCheckingAppVersion: vi.fn(),
  toConnectStep: vi.fn(),
  toConnectionSuccessStep: vi.fn(),
  toDeviceBusyStep: vi.fn(),
  toAwaitingDeviceOperation: vi.fn(),
  toOperationRejectedStep: vi.fn(),
  toDeviceDisconnectStep: vi.fn(),
  toDevicePayloadInvalid: vi.fn(),
  toPairDeviceStep: vi.fn(),
  toStacksAppOutdatedWarning: vi.fn(),
  toErrorStep: vi.fn(),
  cancelLedgerAction: vi.fn(),
  settleLedgerAction: vi.fn(),
  transactionSignedOnLedgerRejected: vi.fn(),
  signHardwareBitcoinTx: vi.fn(),
  captureContext: vi.fn<(value: LedgerTxSigningContext) => void>(),
}));

vi.mock('@app/features/ledger/hardware-wallet/hardware-wallet.context', () => ({
  useHardwareWalletConnector: () => mocks.connector(),
}));

vi.mock('@app/features/ledger/flow/ledger-flow.context', () => ({
  useLedgerFlowState: () => null,
  useLedgerSteps: () => ({
    toCheckingAppVersion: mocks.toCheckingAppVersion,
    toConnectStep: mocks.toConnectStep,
    toConnectionSuccessStep: mocks.toConnectionSuccessStep,
    toDeviceBusyStep: mocks.toDeviceBusyStep,
    toAwaitingDeviceOperation: mocks.toAwaitingDeviceOperation,
    toOperationRejectedStep: mocks.toOperationRejectedStep,
    toDeviceDisconnectStep: mocks.toDeviceDisconnectStep,
    toDevicePayloadInvalid: mocks.toDevicePayloadInvalid,
    toPairDeviceStep: mocks.toPairDeviceStep,
    toStacksAppOutdatedWarning: mocks.toStacksAppOutdatedWarning,
    toErrorStep: mocks.toErrorStep,
    cancelLedgerAction: mocks.cancelLedgerAction,
    settleLedgerAction: mocks.settleLedgerAction,
  }),
}));

vi.mock('@app/features/ledger/hooks/use-ledger-analytics.hook', () => ({
  useLedgerAnalytics: () => ({
    transactionSignedOnLedgerRejected: mocks.transactionSignedOnLedgerRejected,
  }),
}));

vi.mock('@app/features/ledger/generic-flows/tx-signing/tx-signing-flow', () => ({
  TxSigningFlow(props: { context: LedgerTxSigningContext }) {
    mocks.captureContext(props.context);
    return null;
  },
}));

vi.mock(
  '@app/features/ledger/flows/bitcoin-tx-signing/steps/approve-bitcoin-sign-ledger-tx',
  () => ({
    ApproveSignLedgerBitcoinTx: () => null,
  })
);

vi.mock('./use-sign-hardware-bitcoin-tx', () => ({
  useSignHardwareBitcoinTx: () => mocks.signHardwareBitcoinTx,
}));

vi.mock('@app/store/networks/networks.selectors', () => ({
  useCurrentNetwork: () => ({ chain: { bitcoin: { mode: 'mainnet' } } }),
}));

vi.mock('@app/common/hooks/use-scroll-lock', () => ({
  useScrollLock: vi.fn(),
}));

vi.mock('@app/features/ledger/utils/generic-ledger-utils', async importOriginal => {
  const actual = await importOriginal<typeof GenericLedgerUtils>();
  return { ...actual, useCancelLedgerAction: () => false };
});

vi.mock('@leather.io/utils', async importOriginal => {
  const actual = await importOriginal<typeof LeatherUtils>();
  return { ...actual, delay: () => Promise.resolve() };
});

vi.mock('@shared/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

function anyInstanceOf(type: unknown): unknown {
  return expect.any(type);
}

function withAbortSignal(): unknown {
  const anyAbortSignal: unknown = expect.any(AbortSignal);
  return expect.objectContaining({ signal: anyAbortSignal });
}

const psbt = new btc.Transaction().toPSBT();
const requestId = 1;
const inputsToSign = [{ index: 0, derivationPath: "m/84'/0'/0'/0/0" }];
const deniedError = new HardwareWalletError('rejected', 'Rejected by user');
const cancelledError = new HardwareWalletError('cancelled');
const disconnectError = new HardwareWalletError('disconnected', 'device disconnected');

interface RenderSignTxContextParams {
  settleOnRejection: boolean;
  descriptor?: string;
}

function renderSignTxContext({
  settleOnRejection,
  descriptor,
}: RenderSignTxContextParams): LedgerTxSigningContext {
  render(
    <LedgerSignBitcoinTxContainer
      request={{
        kind: 'sign-bitcoin-tx',
        id: requestId,
        resolve: vi.fn(),
        psbt,
        inputsToSign,
        descriptor,
        settleOnRejection,
      }}
    />
  );
  const call = mocks.captureContext.mock.calls.at(-1);
  if (!call) throw new Error('Tx signing context was not rendered');
  return call[0];
}

interface SetupSignTransactionParams {
  settleOnRejection?: boolean;
  descriptor?: string;
  error?: Error;
}

function setupSignTransaction({
  settleOnRejection,
  descriptor,
  error,
}: SetupSignTransactionParams = {}) {
  const bitcoin = makeFakeHardwareBitcoinSigner();
  const session = makeFakeHardwareWallet({ bitcoin });
  const connector = makeFakeHardwareWalletConnector(session);
  mocks.connector.mockReturnValue(connector);
  const signedTx = new btc.Transaction();
  if (error) mocks.signHardwareBitcoinTx.mockRejectedValue(error);
  else mocks.signHardwareBitcoinTx.mockResolvedValue(signedTx);
  return {
    context: renderSignTxContext({ settleOnRejection: settleOnRejection ?? false, descriptor }),
    bitcoin,
    connector,
    session,
    signedTx,
  };
}

function expectSettledOnceWith(outcome: LedgerSigningOutcome<btc.Transaction>) {
  expect(mocks.settleLedgerAction).toHaveBeenCalledOnce();
  expect(mocks.settleLedgerAction).toHaveBeenCalledWith(
    expect.objectContaining({ id: requestId }),
    outcome
  );
}

describe('LedgerSignBitcoinTxContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('settles the flow with the signed transaction', async () => {
    const { context, bitcoin, connector, session, signedTx } = setupSignTransaction();

    await act(async () => {
      await context.signTransaction();
    });

    expect(connector.connect).toHaveBeenCalledWith(
      { chain: 'bitcoin', network: 'mainnet' },
      expect.anything()
    );
    expect(mocks.signHardwareBitcoinTx).toHaveBeenCalledWith(
      bitcoin,
      { psbt: anyInstanceOf(Uint8Array), inputsToSign, descriptor: undefined },
      withAbortSignal()
    );
    expectSettledOnceWith({ status: 'signed', value: signedTx });
    expect(mocks.toOperationRejectedStep).not.toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('shows the policy prompt, then the signing step, as the device asks for them', async () => {
    const { context } = setupSignTransaction({ descriptor: 'wsh(multi(2,@0/**,@1/**))' });
    mocks.signHardwareBitcoinTx.mockImplementation(
      (_signer, _args, ctx: { onInteraction(interaction: unknown): void }) => {
        mocks.toAwaitingDeviceOperation.mockClear();
        ctx.onInteraction({ type: 'approve-policy' });
        ctx.onInteraction({ type: 'confirm-on-device' });
        return Promise.resolve(new btc.Transaction());
      }
    );

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.toDeviceBusyStep).toHaveBeenCalledWith(
      'Approve the Leather wallet policy on your Ledger…'
    );
    expect(mocks.toAwaitingDeviceOperation.mock.calls).toEqual([
      [{ hasApprovedOperation: false }],
      [{ hasApprovedOperation: true }],
    ]);
  });

  test('settles a device denial as a cancellation when the swap opted in', async () => {
    const { context, session } = setupSignTransaction({
      settleOnRejection: true,
      error: deniedError,
    });

    await act(async () => {
      await context.signTransaction();
    });

    expectSettledOnceWith({ status: 'cancelled' });
    expect(mocks.toOperationRejectedStep).not.toHaveBeenCalled();
    expect(mocks.transactionSignedOnLedgerRejected).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('forwards other device errors to the swap when it opted in', async () => {
    const { context } = setupSignTransaction({ settleOnRejection: true, error: disconnectError });

    await act(async () => {
      await context.signTransaction();
    });

    expectSettledOnceWith({ status: 'failed', error: disconnectError.message });
    expect(mocks.toOperationRejectedStep).not.toHaveBeenCalled();
  });

  test('forwards the device error when settling a descriptor signing request', async () => {
    const { context } = setupSignTransaction({
      descriptor: 'wpkh(@0/**)',
      error: disconnectError,
    });

    await act(async () => {
      await context.signTransaction();
    });

    expectSettledOnceWith({ status: 'failed', error: disconnectError.message });
    expect(mocks.toOperationRejectedStep).not.toHaveBeenCalled();
  });

  test('shows the rejected step when the user denies a descriptor signing on the device', async () => {
    const { context } = setupSignTransaction({ descriptor: 'wpkh(@0/**)', error: deniedError });

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.toOperationRejectedStep).toHaveBeenCalledOnce();
    expect(mocks.settleLedgerAction).not.toHaveBeenCalled();
  });

  test('fails other flows with the device error instead of showing the rejected step', async () => {
    const { context } = setupSignTransaction({ error: disconnectError });

    await act(async () => {
      await context.signTransaction();
    });

    expectSettledOnceWith({ status: 'failed', error: disconnectError.message });
    expect(mocks.toOperationRejectedStep).not.toHaveBeenCalled();
  });

  test('keeps the rejected step and leaves the promise pending for other flows', async () => {
    const { context } = setupSignTransaction({ error: deniedError });

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.toOperationRejectedStep).toHaveBeenCalledOnce();
    expect(mocks.settleLedgerAction).not.toHaveBeenCalled();
  });

  test('stays silent when the user cancelled the device action from the sheet', async () => {
    const { context, session } = setupSignTransaction({
      settleOnRejection: true,
      error: cancelledError,
    });

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.settleLedgerAction).not.toHaveBeenCalled();
    expect(mocks.toOperationRejectedStep).not.toHaveBeenCalled();
    expect(mocks.toErrorStep).not.toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('shows the wrong-app message when another app is open on the device', async () => {
    const { context, connector } = setupSignTransaction();
    connector.connect.mockRejectedValue(
      new HardwareWalletError('wrong-app', 'Unable to open the Bitcoin app on your Ledger.')
    );

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.toErrorStep).toHaveBeenCalledWith(
      'bitcoin',
      'Unable to open the Bitcoin app on your Ledger.'
    );
    expect(mocks.signHardwareBitcoinTx).not.toHaveBeenCalled();
  });
});
