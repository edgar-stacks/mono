import { deserializeTransaction } from '@stacks/transactions';

import { getStacksSigner, isHardwareWalletError } from '@leather.io/ledger';
import { delay } from '@leather.io/utils';

import { useLedgerSteps } from '@app/features/ledger/flow/ledger-flow.context';
import type { ActiveLedgerSigningRequest } from '@app/features/ledger/flow/ledger-flow.types';
import { type LedgerTxSigningContext } from '@app/features/ledger/generic-flows/tx-signing/ledger-sign-tx.context';
import { useHardwareWalletOperation } from '@app/features/ledger/hardware-wallet/use-hardware-wallet-operation';
import { useCancelLedgerAction } from '@app/features/ledger/utils/generic-ledger-utils';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

import { TxSigningFlow } from '../../generic-flows/tx-signing/tx-signing-flow';
import { useLedgerAnalytics } from '../../hooks/use-ledger-analytics.hook';
import { useLedgerFingerprintMigration } from '../../hooks/use-ledger-fingerprint-migration';
import { ApproveSignLedgerStacksTx } from './steps/approve-sign-stacks-ledger-tx';

const txSigningCheckingAppVersionDelayMs = 500;

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
      checkingAppVersionDelayMs: txSigningCheckingAppVersionDelayMs,
    });

  function settleSigningError(error: unknown) {
    if (!isHardwareWalletError(error) || error.kind === 'cancelled') throw error;
    if (error.kind === 'rejected') {
      ledgerAnalytics.transactionSignedOnLedgerRejected();
      if (!settleOnRejection) throw error;
      ledgerNavigate.settleLedgerAction(request, { status: 'cancelled' });
      return;
    }
    if (!settleOnRejection) throw error;
    ledgerNavigate.settleLedgerAction(request, { status: 'failed', error: error.message });
  }

  async function signTransaction() {
    await run(async (wallet, ctx) => {
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
      } catch (error) {
        settleSigningError(error);
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
