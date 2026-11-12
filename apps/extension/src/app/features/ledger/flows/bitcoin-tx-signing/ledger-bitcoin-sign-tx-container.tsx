import { useMemo } from 'react';

import * as btc from '@scure/btc-signer';

import {
  type HardwareWalletInteraction,
  getBitcoinSigner,
  isHardwareWalletError,
} from '@leather.io/ledger';
import { delay, isError } from '@leather.io/utils';

import { logger } from '@shared/logger';

import { useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import type { ActiveLedgerSigningRequest } from '@app/features/ledger/flow/ledger-flow.types';
import { ApproveSignLedgerBitcoinTx } from '@app/features/ledger/flows/bitcoin-tx-signing/steps/approve-bitcoin-sign-ledger-tx';
import { type LedgerTxSigningContext } from '@app/features/ledger/generic-flows/tx-signing/ledger-sign-tx.context';
import { TxSigningFlow } from '@app/features/ledger/generic-flows/tx-signing/tx-signing-flow';
import { useHardwareWalletOperation } from '@app/features/ledger/hardware-wallet/use-hardware-wallet-operation';
import { useLedgerAnalytics } from '@app/features/ledger/hooks/use-ledger-analytics.hook';
import {
  registerLedgerWalletPolicyPrompt,
  useCancelLedgerAction,
} from '@app/features/ledger/utils/generic-ledger-utils';

import { useSignHardwareBitcoinTx } from './use-sign-hardware-bitcoin-tx';

const txSigningCheckingAppVersionDelayMs = 500;

interface LedgerSignBitcoinTxContainerProps {
  request: ActiveLedgerSigningRequest<'sign-bitcoin-tx'>;
}
export function LedgerSignBitcoinTxContainer({ request }: LedgerSignBitcoinTxContainerProps) {
  const ledgerNavigate = useLedgerSteps();
  const ledgerAnalytics = useLedgerAnalytics();

  const signHardwareBitcoinTx = useSignHardwareBitcoinTx();

  const { psbt, inputsToSign, descriptor, settleOnRejection } = request;
  const unsignedTransaction = useMemo(() => btc.Transaction.fromPSBT(psbt), [psbt]);

  const chain = 'bitcoin';

  function onInteraction({ type }: HardwareWalletInteraction) {
    if (type === 'approve-policy')
      ledgerNavigate.toDeviceBusyStep(registerLedgerWalletPolicyPrompt);
    if (type === 'confirm-on-device')
      ledgerNavigate.toAwaitingDeviceOperation({ hasApprovedOperation: false });
  }

  const { run, cancel, latestDeviceResponse, awaitingDeviceConnection, isConnectionCancellable } =
    useHardwareWalletOperation({
      chain,
      checkingAppVersionDelayMs: txSigningCheckingAppVersionDelayMs,
      onInteraction,
    });

  async function signTransaction() {
    await run(async (wallet, ctx) => {
      ledgerNavigate.toDeviceBusyStep('Verifying public key on Ledger…');

      ledgerNavigate.toConnectionSuccessStep('bitcoin');
      await delay(1200);

      ledgerNavigate.toAwaitingDeviceOperation({ hasApprovedOperation: false });

      try {
        const btcTx = await signHardwareBitcoinTx(
          getBitcoinSigner(wallet),
          { psbt: unsignedTransaction.toPSBT(), inputsToSign, descriptor },
          ctx
        );

        ledgerNavigate.toAwaitingDeviceOperation({ hasApprovedOperation: true });
        await delay(1200);
        ledgerNavigate.settleLedgerAction(request, { status: 'signed', value: btcTx });
      } catch (e) {
        if (isHardwareWalletError(e) && e.kind === 'cancelled') return;
        logger.error('Unable to sign tx with ledger', e);
        ledgerAnalytics.transactionSignedOnLedgerRejected();
        // Descriptor signing is awaited by the rpc popup, which owns the error
        // UI and the dApp response. Settle that promise with the error rather
        // than leaving it to hang forever. Other flows keep the standard
        // on-device rejection screen.
        if (!isHardwareWalletError(e) || e.kind !== 'rejected') {
          ledgerNavigate.settleLedgerAction(
            request,
            isError(e) ? { status: 'failed', error: e.message } : { status: 'cancelled' }
          );
        } else if (settleOnRejection) {
          ledgerNavigate.settleLedgerAction(request, { status: 'cancelled' });
        } else {
          ledgerNavigate.toOperationRejectedStep();
        }
      }
    });
  }

  function closeAction() {
    cancel();
    ledgerNavigate.cancelLedgerAction();
  }

  const ledgerContextValue: LedgerTxSigningContext = {
    chain,
    transaction: unsignedTransaction,
    signTransaction,
    latestDeviceResponse,
    awaitingDeviceConnection,
  };
  const canCancelLedgerAction = useCancelLedgerAction({
    awaitingDeviceConnection,
    isConnectionCancellable,
  });

  return (
    <TxSigningFlow
      context={ledgerContextValue}
      closeAction={canCancelLedgerAction ? closeAction : undefined}
      renderStep={{ 'awaiting-device-operation': <ApproveSignLedgerBitcoinTx /> }}
    />
  );
}
