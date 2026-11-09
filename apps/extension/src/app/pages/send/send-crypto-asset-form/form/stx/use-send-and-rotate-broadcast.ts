import { useRef, useState } from 'react';

import { type StacksTransactionWire } from '@stacks/transactions';

import { isString } from '@leather.io/utils';

import { logger } from '@shared/logger';

import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { useSubmitTransactionCallback } from '@app/common/hooks/use-submit-stx-transaction';
import { getRecipientFromStacksTransaction } from '@app/common/transactions/stacks/transaction.utils';
import { useStacksBroadcastTransaction } from '@app/common/transactions/stacks/use-stacks-broadcast-transaction';
import { isLedgerSigningCancelledError } from '@app/features/ledger/flow/unwrap-ledger-signing-outcome';
import { toastDurations, useToast } from '@app/features/toasts/use-toast';
import { useFreshStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useActiveWalletType } from '@app/store/common/wallet-type.selectors';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';
import { LoadingKeys } from '@app/store/ui/ui.hooks';

const signingCancelledMessage = 'Signing was cancelled. Nothing was sent.';

export function useSendAndRotateBroadcast() {
  const toast = useToast();
  const walletType = useActiveWalletType();
  const freshAccount = useFreshStacksAccount();
  const { createNewAccount, switchAccount } = useKeyActions();
  const signStacksTransaction = useSignStacksTransaction();
  const submitTransaction = useSubmitTransactionCallback({
    loadingKey: LoadingKeys.SUBMIT_STACKS_TRANSACTION,
  });
  const signedRotationTxRef = useRef<StacksTransactionWire | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  function switchToFreshAccount() {
    if (!freshAccount) return;
    if (walletType === 'software') return void createNewAccount(freshAccount.fingerprint);
    // TODO: test ledger flow
    switchAccount({
      fingerprint: freshAccount.fingerprint,
      accountIndex: freshAccount.accountIndex,
    });
  }

  async function moveRemainingStx() {
    const signedRotationTx = signedRotationTxRef.current;
    signedRotationTxRef.current = null;
    if (!signedRotationTx) return;

    await submitTransaction({
      onError(error) {
        const message = isString(error) ? error : error.message;
        toast.error(`Your send went through, but moving remaining STX failed: ${message}`);
      },
      onSuccess() {
        switchToFreshAccount();
        toast.success('Moved remaining STX and switched to the fresh account', {
          duration: toastDurations.standard,
        });
      },
    })(signedRotationTx);
  }

  const { stacksBroadcastSignedTransaction, isBroadcasting } = useStacksBroadcastTransaction({
    token: 'STX',
    redirectToSuccessPage: true,
    onBroadcastSuccess() {
      void moveRemainingStx();
    },
  });

  async function signTransaction(tx: StacksTransactionWire, failureMessage?: string) {
    try {
      const signedTx = await signStacksTransaction(tx);
      if (!signedTx) toast.error(signingCancelledMessage);
      return signedTx ?? null;
    } catch (error) {
      if (isLedgerSigningCancelledError(error)) {
        toast.error(signingCancelledMessage);
        return null;
      }
      logger.error('Unable to sign transaction', error);
      if (failureMessage) toast.error(failureMessage);
      return null;
    }
  }

  async function signBothTransactions(
    sendTx: StacksTransactionWire,
    rotationTx: StacksTransactionWire
  ) {
    setIsSigning(true);
    try {
      const signedSendTx = await signTransaction(sendTx);
      if (!signedSendTx) return null;
      const signedRotationTx = await signTransaction(
        rotationTx,
        'Unable to sign the second transaction'
      );
      if (!signedRotationTx) return null;
      return { signedSendTx, signedRotationTx };
    } finally {
      setIsSigning(false);
    }
  }

  async function sendAndRotate(sendTx: StacksTransactionWire, rotationTx: StacksTransactionWire) {
    if (!freshAccount || getRecipientFromStacksTransaction(rotationTx) !== freshAccount.address)
      return toast.error('Your accounts changed. Go back and review this transaction again.');

    const signedTransactions = await signBothTransactions(sendTx, rotationTx);
    if (!signedTransactions) return;

    signedRotationTxRef.current = signedTransactions.signedRotationTx;
    await stacksBroadcastSignedTransaction(signedTransactions.signedSendTx);
    signedRotationTxRef.current = null;
  }

  return { sendAndRotate, isSendingAndRotating: isSigning || isBroadcasting };
}
