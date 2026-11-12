import { deserializeTransaction, makeUnsignedSTXTokenTransfer } from '@stacks/transactions';
import { act, render } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { type HardwareWalletConnector, HardwareWalletError } from '@leather.io/ledger';
import {
  makeFakeHardwareStacksSigner,
  makeFakeHardwareWallet,
  makeFakeHardwareWalletConnector,
} from '@leather.io/ledger/test-utils';
import type * as LeatherUtils from '@leather.io/utils';

import type { LedgerSigningOutcome } from '@app/features/ledger/flow/ledger-flow.types';
import type { LedgerTxSigningContext } from '@app/features/ledger/generic-flows/tx-signing/ledger-sign-tx.context';
import type * as GenericLedgerUtils from '@app/features/ledger/utils/generic-ledger-utils';

import { LedgerSignStacksTxContainer } from './ledger-sign-stacks-tx-container';

const mocks = vi.hoisted(() => ({
  connector: vi.fn<() => HardwareWalletConnector>(),
  toCheckingAppVersion: vi.fn(),
  toConnectStep: vi.fn(),
  toConnectionSuccessStep: vi.fn(),
  toAwaitingDeviceOperation: vi.fn(),
  toDevicePayloadInvalid: vi.fn(),
  toOperationRejectedStep: vi.fn(),
  toDeviceDisconnectStep: vi.fn(),
  toPairDeviceStep: vi.fn(),
  toStacksAppOutdatedWarning: vi.fn(),
  toErrorStep: vi.fn(),
  settleLedgerAction: vi.fn(),
  transactionSignedOnLedgerSuccessfully: vi.fn(),
  transactionSignedOnLedgerRejected: vi.fn(),
  migrateFingerprint: vi.fn(),
  captureContext: vi.fn<(value: LedgerTxSigningContext) => void>(),
}));

vi.mock('@app/features/ledger/hardware-wallet/hardware-wallet.context', () => ({
  useHardwareWalletConnector: () => mocks.connector(),
}));

vi.mock('@app/store/networks/networks.selectors', () => ({
  useCurrentNetwork: () => ({ chain: { bitcoin: { mode: 'mainnet' } } }),
}));

vi.mock('@app/features/ledger/flow/ledger-flow.context', () => ({
  useLedgerFlowState: () => null,
  useLedgerSteps: () => ({
    toCheckingAppVersion: mocks.toCheckingAppVersion,
    toConnectStep: mocks.toConnectStep,
    toConnectionSuccessStep: mocks.toConnectionSuccessStep,
    toAwaitingDeviceOperation: mocks.toAwaitingDeviceOperation,
    toDevicePayloadInvalid: mocks.toDevicePayloadInvalid,
    toOperationRejectedStep: mocks.toOperationRejectedStep,
    toDeviceDisconnectStep: mocks.toDeviceDisconnectStep,
    toPairDeviceStep: mocks.toPairDeviceStep,
    toStacksAppOutdatedWarning: mocks.toStacksAppOutdatedWarning,
    toErrorStep: mocks.toErrorStep,
    settleLedgerAction: mocks.settleLedgerAction,
  }),
}));

vi.mock('@app/features/ledger/hooks/use-ledger-analytics.hook', () => ({
  useLedgerAnalytics: () => ({
    transactionSignedOnLedgerSuccessfully: mocks.transactionSignedOnLedgerSuccessfully,
    transactionSignedOnLedgerRejected: mocks.transactionSignedOnLedgerRejected,
  }),
}));

vi.mock('@app/features/ledger/hooks/use-ledger-fingerprint-migration', () => ({
  useLedgerFingerprintMigration: () => mocks.migrateFingerprint,
}));

vi.mock('@app/features/ledger/generic-flows/tx-signing/tx-signing-flow', () => ({
  TxSigningFlow(props: { context: LedgerTxSigningContext }) {
    mocks.captureContext(props.context);
    return null;
  },
}));

vi.mock('./steps/approve-sign-stacks-ledger-tx', () => ({
  ApproveSignLedgerStacksTx: () => null,
}));

vi.mock('@app/common/hooks/use-scroll-lock', () => ({
  useScrollLock: vi.fn(),
}));

vi.mock('@app/store/accounts/blockchain/stacks/stacks-account.hooks', () => ({
  useCurrentStacksAccount: () => ({
    derivationPath: "m/44'/5757'/0'/0/0",
    stxPublicKey: '029f9d43e161b2ecb86d78262d47d2cd10d20ab7b4c303cd4f0e26744c72e340fc',
  }),
}));

vi.mock('@app/features/ledger/utils/generic-ledger-utils', async importOriginal => {
  const actual = await importOriginal<typeof GenericLedgerUtils>();
  return { ...actual, useCancelLedgerAction: () => false };
});

vi.mock('@leather.io/utils', async importOriginal => {
  const actual = await importOriginal<typeof LeatherUtils>();
  return { ...actual, delay: () => Promise.resolve() };
});

function transactionMatcher(): unknown {
  const anyAuth: unknown = expect.anything();
  return expect.objectContaining({ auth: anyAuth });
}

let unsignedTx = '';

beforeAll(async () => {
  const transaction = await makeUnsignedSTXTokenTransfer({
    recipient: 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB',
    amount: 500,
    fee: 100,
    nonce: 0,
    network: 'mainnet',
    publicKey: '029f9d43e161b2ecb86d78262d47d2cd10d20ab7b4c303cd4f0e26744c72e340fc',
  });
  unsignedTx = transaction.serialize();
});

const requestId = 1;

function expectSettledOnceWith(outcome: LedgerSigningOutcome<unknown>) {
  expect(mocks.settleLedgerAction).toHaveBeenCalledOnce();
  expect(mocks.settleLedgerAction).toHaveBeenCalledWith(
    expect.objectContaining({ id: requestId }),
    outcome
  );
}

function renderSignTxContext(settleOnRejection: boolean): LedgerTxSigningContext {
  render(
    <LedgerSignStacksTxContainer
      request={{
        kind: 'sign-stacks-tx',
        id: requestId,
        resolve: vi.fn(),
        tx: unsignedTx,
        settleOnRejection,
      }}
    />
  );
  const call = mocks.captureContext.mock.calls.at(-1);
  if (!call) throw new Error('Tx signing context was not rendered');
  return call[0];
}

interface SetupSignTransactionParams {
  signTransactionError?: HardwareWalletError;
  settleOnRejection?: boolean;
}

function setupSignTransaction({
  signTransactionError,
  settleOnRejection,
}: SetupSignTransactionParams = {}) {
  const signedTx = deserializeTransaction(unsignedTx);
  const stacks = makeFakeHardwareStacksSigner();
  if (signTransactionError) stacks.signTransaction.mockRejectedValue(signTransactionError);
  else stacks.signTransaction.mockResolvedValue(signedTx);
  const session = makeFakeHardwareWallet({ stacks });
  const connector = makeFakeHardwareWalletConnector(session);
  mocks.connector.mockReturnValue(connector);
  mocks.migrateFingerprint.mockResolvedValue(undefined);
  return {
    context: renderSignTxContext(settleOnRejection ?? false),
    connector,
    session,
    stacks,
    signedTx,
  };
}

describe('LedgerSignStacksTxContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('settles the flow with the signed transaction', async () => {
    const { context, connector, session, stacks, signedTx } = setupSignTransaction();

    await act(async () => {
      await context.signTransaction();
    });

    expect(connector.connect).toHaveBeenCalledWith({ chain: 'stacks' }, expect.anything());
    expect(mocks.migrateFingerprint).toHaveBeenCalledWith(stacks, expect.anything());
    expect(stacks.signTransaction).toHaveBeenCalledWith(
      {
        transaction: transactionMatcher(),
        derivationPath: "m/44'/5757'/0'/0/0",
      },
      expect.anything()
    );
    expect(mocks.transactionSignedOnLedgerSuccessfully).toHaveBeenCalledOnce();
    expectSettledOnceWith({ status: 'signed', value: signedTx });
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('settles a device denial as a cancellation when the swap opted in', async () => {
    const { context, session } = setupSignTransaction({
      signTransactionError: new HardwareWalletError('rejected', 'Transaction rejected'),
      settleOnRejection: true,
    });

    await act(async () => {
      await context.signTransaction();
    });

    expectSettledOnceWith({ status: 'cancelled' });
    expect(mocks.toOperationRejectedStep).not.toHaveBeenCalled();
    expect(mocks.transactionSignedOnLedgerRejected).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('forwards an invalid payload error to the swap when it opted in', async () => {
    const { context } = setupSignTransaction({
      signTransactionError: new HardwareWalletError('invalid-payload', 'Data is invalid : bad tx'),
      settleOnRejection: true,
    });

    await act(async () => {
      await context.signTransaction();
    });

    expectSettledOnceWith({ status: 'failed', error: 'Data is invalid : bad tx' });
    expect(mocks.toDevicePayloadInvalid).not.toHaveBeenCalled();
    expect(mocks.toErrorStep).not.toHaveBeenCalled();
  });

  test('forwards a transport failure to the swap when it opted in', async () => {
    const { context } = setupSignTransaction({
      signTransactionError: new HardwareWalletError(
        'disconnected',
        'DisconnectedDeviceDuringOperation: device disconnected'
      ),
      settleOnRejection: true,
    });

    await act(async () => {
      await context.signTransaction();
    });

    expectSettledOnceWith({
      status: 'failed',
      error: 'DisconnectedDeviceDuringOperation: device disconnected',
    });
    expect(mocks.toErrorStep).not.toHaveBeenCalled();
    expect(mocks.toDeviceDisconnectStep).not.toHaveBeenCalled();
  });

  test('keeps the rejected step and leaves the promise pending for other flows', async () => {
    const { context, session } = setupSignTransaction({
      signTransactionError: new HardwareWalletError('rejected', 'Transaction rejected'),
    });

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.toOperationRejectedStep).toHaveBeenCalledOnce();
    expect(mocks.transactionSignedOnLedgerRejected).toHaveBeenCalledOnce();
    expect(mocks.settleLedgerAction).not.toHaveBeenCalled();
    expect(session.close).toHaveBeenCalledOnce();
  });

  test('shows the invalid payload step for other flows', async () => {
    const { context } = setupSignTransaction({
      signTransactionError: new HardwareWalletError('invalid-payload', 'Data is invalid : bad tx'),
    });

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.toDevicePayloadInvalid).toHaveBeenCalledOnce();
    expect(mocks.settleLedgerAction).not.toHaveBeenCalled();
  });

  test('shows the disconnected step for other flows', async () => {
    const { context } = setupSignTransaction({
      signTransactionError: new HardwareWalletError('disconnected'),
    });

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.toDeviceDisconnectStep).toHaveBeenCalledOnce();
    expect(mocks.settleLedgerAction).not.toHaveBeenCalled();
  });

  test('stays silent when the signing is cancelled', async () => {
    const { context } = setupSignTransaction({
      signTransactionError: new HardwareWalletError('cancelled'),
      settleOnRejection: true,
    });

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.settleLedgerAction).not.toHaveBeenCalled();
    expect(mocks.toErrorStep).not.toHaveBeenCalled();
  });

  test('warns about an outdated Stacks app before signing', async () => {
    const { context, connector, stacks } = setupSignTransaction();
    const details = { currentVersion: '0.26.17', requiredVersion: '0.26.19' };
    connector.connect.mockRejectedValue(
      new HardwareWalletError('outdated-app', undefined, { details })
    );

    await act(async () => {
      await context.signTransaction();
    });

    expect(mocks.toStacksAppOutdatedWarning).toHaveBeenCalledWith(details);
    expect(stacks.signTransaction).not.toHaveBeenCalled();
    expect(mocks.settleLedgerAction).not.toHaveBeenCalled();
  });
});
