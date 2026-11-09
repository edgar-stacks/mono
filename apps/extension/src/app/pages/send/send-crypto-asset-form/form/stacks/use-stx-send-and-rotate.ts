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
import { useStacksRotationTargetAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import type { StacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.models';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';
import { LoadingKeys } from '@app/store/ui/ui.hooks';

type SignOutcome =
  | { status: 'signed'; tx: StacksTransactionWire }
  | { status: 'cancelled' }
  | { status: 'failed' };

interface PendingRotation {
  tx: StacksTransactionWire;
  target: StacksAccount;
}

export function useStxSendAndRotate() {
  const toast = useToast();
  const signStacksTransaction = useSignStacksTransaction();
  const target = useStacksRotationTargetAccount();
  const { createNewAccount, switchAccount } = useKeyActions();
  const submitRotationTransaction = useSubmitTransactionCallback({
    loadingKey: LoadingKeys.SUBMIT_STACKS_TRANSACTION,
  });
  const pendingRotationRef = useRef<PendingRotation | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  function switchToRotationTarget(rotationTarget: StacksAccount) {
    if (rotationTarget.type === 'ledger') {
      // TODO: test ledger flow
      return switchAccount({
        fingerprint: rotationTarget.fingerprint,
        accountIndex: rotationTarget.accountIndex,
      });
    }
    void createNewAccount(rotationTarget.fingerprint);
  }

  function broadcastRotation() {
    const pendingRotation = pendingRotationRef.current;
    pendingRotationRef.current = null;
    if (!pendingRotation) return;
    void submitRotationTransaction({
      onSuccess() {
        switchToRotationTarget(pendingRotation.target);
        toast.success('Moved remaining STX and switched to the fresh account', {
          duration: toastDurations.standard,
        });
      },
      onError(error) {
        const message = isString(error) ? error : error.message;
        toast.error(`Your send went through, but moving remaining STX failed: ${message}`);
      },
      replaceByFee: false,
    })(pendingRotation.tx);
  }

  const { stacksBroadcastSignedTransaction, isBroadcasting } = useStacksBroadcastTransaction({
    token: 'STX',
    redirectToSuccessPage: true,
    onBroadcastSuccess: broadcastRotation,
  });

  async function signTransaction(tx: StacksTransactionWire): Promise<SignOutcome> {
    try {
      const signedTx = await signStacksTransaction(tx);
      if (!signedTx) return { status: 'cancelled' };
      return { status: 'signed', tx: signedTx };
    } catch (error) {
      if (isLedgerSigningCancelledError(error)) return { status: 'cancelled' };
      logger.error('Unable to sign send and rotate transaction', { error });
      return { status: 'failed' };
    }
  }

  async function signBoth(sendTx: StacksTransactionWire, rotationTx: StacksTransactionWire) {
    const signedSend = await signTransaction(sendTx);
    if (signedSend.status === 'cancelled') {
      toast.error('Signing was cancelled. Nothing was sent.');
      return;
    }
    if (signedSend.status === 'failed') return;

    const signedRotation = await signTransaction(rotationTx);
    if (signedRotation.status === 'cancelled') {
      toast.error('Signing was cancelled. Nothing was sent.');
      return;
    }
    if (signedRotation.status === 'failed') {
      toast.error('Unable to sign the second transaction');
      return;
    }
    return { sendTx: signedSend.tx, rotationTx: signedRotation.tx };
  }

  async function sendAndRotate(sendTx: StacksTransactionWire, rotationTx: StacksTransactionWire) {
    if (!target || getRecipientFromStacksTransaction(rotationTx) !== target.address) {
      toast.error('Your accounts changed. Go back and review this transaction again.');
      return;
    }

    setIsSigning(true);
    const signed = await signBoth(sendTx, rotationTx).finally(() => setIsSigning(false));
    if (!signed) return;

    pendingRotationRef.current = { tx: signed.rotationTx, target };
    await stacksBroadcastSignedTransaction(signed.sendTx);
  }

  return {
    sendAndRotate,
    isSendingAndRotating: isSigning || isBroadcasting,
  };
}
