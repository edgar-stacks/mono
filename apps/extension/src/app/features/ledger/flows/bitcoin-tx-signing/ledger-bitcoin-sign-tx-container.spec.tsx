// @vitest-environment jsdom
import * as btc from '@scure/btc-signer';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { HardwareWalletError } from '@leather.io/ledger';
import {
  makeFakeHardwareBitcoinSigner,
  makeFakeHardwareWallet,
  makeFakeHardwareWalletConnector,
  makeFakeHardwareWalletSession,
} from '@leather.io/ledger/test-utils';
import type * as LeatherUtils from '@leather.io/utils';

import type { LedgerSigningOutcome } from '@app/features/ledger/flow/ledger-flow.types';
import type { LedgerTxSigningContext } from '@app/features/ledger/generic-flows/tx-signing/ledger-sign-tx.context';
import type * as GenericLedgerUtils from '@app/features/ledger/utils/generic-ledger-utils';

import { LedgerSignBitcoinTxContainer } from './ledger-bitcoin-sign-tx-container';

const mocks = vi.hoisted(() => ({
  toCheckingAppVersion: vi.fn(),
  toConnectionSuccessStep: vi.fn(),
  toDeviceBusyStep: vi.fn(),
  toAwaitingDeviceOperation: vi.fn(),
  toOperationRejectedStep: vi.fn(),
  toErrorStep: vi.fn(),
  cancelLedgerAction: vi.fn(),
  settleLedgerAction: vi.fn(),
  transactionSignedOnLedgerRejected: vi.fn(),
  connect: vi.fn(),
  signLedger: vi.fn(),
  signLedgerDescriptor: vi.fn(),
  toastError: vi.fn(),
  captureContext: vi.fn<(value: LedgerTxSigningContext) => void>(),
}));

vi.mock('@leather.io/bitcoin', () => ({
  makeNativeSegwitAccountDerivationPath: vi.fn(),
  makeTaprootAccountDerivationPath: vi.fn(),
}));

vi.mock('@app/features/ledger/hardware-wallet/hardware-wallet.context', () => ({
  useHardwareWalletConnector: () => makeFakeHardwareWalletConnector({ connect: mocks.connect }),
}));

vi.mock('@app/features/ledger/flow/ledger-flow.context', () => ({
  useLedgerFlowState: () => null,
  useLedgerSteps: () => ({
    toCheckingAppVersion: mocks.toCheckingAppVersion,
    toConnectionSuccessStep: mocks.toConnectionSuccessStep,
    toDeviceBusyStep: mocks.toDeviceBusyStep,
    toAwaitingDeviceOperation: mocks.toAwaitingDeviceOperation,
    toOperationRejectedStep: mocks.toOperationRejectedStep,
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

vi.mock('./use-sign-ledger-descriptor-tx', () => ({
  useSignLedgerDescriptorTx: () => mocks.signLedgerDescriptor,
}));

vi.mock('@app/store/accounts/blockchain/bitcoin/bitcoin.hooks', () => ({
  useSignLedgerBitcoinTx: () => mocks.signLedger,
}));

vi.mock('@app/store/networks/networks.selectors', () => ({
  useCurrentNetwork: () => ({ chain: { bitcoin: { mode: 'mainnet' } } }),
}));

vi.mock('@app/features/toasts/use-toast', () => ({
  useToast: () => ({ error: mocks.toastError }),
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

const psbt = new btc.Transaction().toPSBT();
const requestId = 1;
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
        inputsToSign: [],
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
}: SetupSignTransactionParams) {
  const session = makeFakeHardwareWalletSession(
    makeFakeHardwareWallet({ bitcoin: makeFakeHardwareBitcoinSigner() })
  );
  mocks.connect.mockResolvedValue(session);
  if (error) {
    mocks.signLedger.mockRejectedValue(error);
    mocks.signLedgerDescriptor.mockRejectedValue(error);
  } else {
    mocks.signLedger.mockResolvedValue(undefined);
    mocks.signLedgerDescriptor.mockResolvedValue(undefined);
  }
  return {
    session,
    context: renderSignTxContext({ settleOnRejection: settleOnRejection ?? false, descriptor }),
  };
}

function expectSettledOnceWith(outcome: LedgerSigningOutcome<btc.Transaction>) {
  expect(mocks.settleLedgerAction).toHaveBeenCalledOnce();
  expect(mocks.settleLedgerAction).toHaveBeenCalledWith(
    expect.objectContaining({ id: requestId }),
    outcome
  );
}

function anyAbortSignal(): unknown {
  return expect.any(AbortSignal);
}

describe('LedgerSignBitcoinTxContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('settles the flow with the signed transaction', async () => {
    const signedPsbt = new btc.Transaction();
    const { context, session } = setupSignTransaction({});
    mocks.signLedger.mockResolvedValue(signedPsbt);

    await act(async () => {
      await context.signTransaction();
    });

    expectSettledOnceWith({ status: 'signed', value: signedPsbt });
    expect(mocks.toOperationRejectedStep).not.toHaveBeenCalled();
    expect(mocks.connect).toHaveBeenCalledWith(
      { chain: 'bitcoin', network: 'mainnet' },
      expect.anything()
    );
    expect(mocks.signLedger).toHaveBeenCalledWith(
      session.bitcoin,
      { signal: anyAbortSignal() },
      psbt,
      []
    );
    expect(session.close).toHaveBeenCalledOnce();
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

  test('forwards a missing signed transaction to the swap when it opted in', async () => {
    const { context } = setupSignTransaction({ settleOnRejection: true });

    await act(async () => {
      await context.signTransaction();
    });

    expectSettledOnceWith({ status: 'failed', error: 'No tx returned' });
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
});
