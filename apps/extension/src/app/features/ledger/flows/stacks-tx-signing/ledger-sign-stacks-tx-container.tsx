import { deserializeTransaction } from '@stacks/transactions';

import { getStacksSigner, isHardwareWalletError } from '@leather.io/ledger';
import { delay } from '@leather.io/utils';

import { useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import type {
  ActiveLedgerSigningRequest,
  LedgerSigningFailure,
} from '@app/features/ledger/flow/ledger-flow.types';
import { type LedgerTxSigningContext } from '@app/features/ledger/generic-flows/tx-signing/ledger-sign-tx.context';
import {
  txSigningCheckingAppVersionDelayMs,
  useHardwareWalletOperation,
} from '@app/features/ledger/hardware-wallet/use-hardware-wallet-operation';
import { useCancelLedgerAction } from '@app/features/ledger/utils/generic-ledger-utils';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

import { TxSigningFlow } from '../../generic-flows/tx-signing/tx-signing-flow';
import { useLedgerAnalytics } from '../../hooks/use-ledger-analytics.hook';
import { useLedgerFingerprintMigration } from '../../hooks/use-ledger-fingerprint-migration';
import { ApproveSignLedgerStacksTx } from './steps/approve-sign-stacks-ledger-tx';

function toSigningFailure(error?: string): LedgerSigningFailure {
  return error === undefined ? { status: 'cancelled' } : { status: 'failed', error };
}

interface LedgerSignStacksTxContainerProps {
  request: ActiveLedgerSigningRequest<'sign-stacks-tx'>;
}
export function LedgerSignStacksTxContainer({ request }: LedgerSignStacksTxContainerProps) {
  const ledgerNavigate = useLedgerSteps();
  const ledgerAnalytics = useLedgerAnalytics();
  const account = useCurrentStacksAccount();
  const migrateFingerprintIfNeeded = useLedgerFingerprintMigration();
  const { tx: unsignedTx, settleOnRejection } = request;

  const chain = 'stacks';

  const { run, cancel, latestDeviceResponse, awaitingDeviceConnection, isConnectionCancellable } =
    useHardwareWalletOperation({
      chain,
      checkingAppVersionDelay: txSigningCheckingAppVersionDelayMs,
    });

  async function signTransaction() {
    await run({ chain }, async (wallet, ctx) => {
      if (!account) {
        const errorMessage = 'No active account found for transaction signing';
        ledgerNavigate.toErrorStep(chain, errorMessage);
        return;
      }

      const signer = getStacksSigner(wallet);
      await migrateFingerprintIfNeeded(signer, ctx);

      ledgerNavigate.toConnectionSuccessStep('stacks');
      await delay(1000);

      ledgerNavigate.toAwaitingDeviceOperation({ hasApprovedOperation: false });

      try {
        const signedTx = await signer.signTransaction(
          {
            transaction: deserializeTransaction(unsignedTx),
            derivationPath: account.derivationPath,
          },
          ctx
        );

        ledgerNavigate.toAwaitingDeviceOperation({ hasApprovedOperation: true });

        await delay(1000);

        ledgerAnalytics.transactionSignedOnLedgerSuccessfully();

        ledgerNavigate.settleLedgerAction(request, { status: 'signed', value: signedTx });
      } catch (e) {
        if (!isHardwareWalletError(e) || e.kind === 'cancelled') throw e;

        if (e.kind === 'rejected') {
          if (settleOnRejection) {
            ledgerNavigate.settleLedgerAction(request, toSigningFailure());
          } else {
            ledgerNavigate.toOperationRejectedStep();
          }
          ledgerAnalytics.transactionSignedOnLedgerRejected();
          return;
        }

        if (!settleOnRejection) throw e;
        ledgerNavigate.settleLedgerAction(request, toSigningFailure(e.message));
      }
    });
  }

  function closeAction() {
    cancel();
    ledgerNavigate.cancelLedgerAction();
  }

  const ledgerContextValue: LedgerTxSigningContext = {
    chain,
    transaction: deserializeTransaction(unsignedTx),
    signTransaction,
    onCancelTxSigning: closeAction,
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
      renderStep={{ 'awaiting-device-operation': <ApproveSignLedgerStacksTx /> }}
    />
  );
}
