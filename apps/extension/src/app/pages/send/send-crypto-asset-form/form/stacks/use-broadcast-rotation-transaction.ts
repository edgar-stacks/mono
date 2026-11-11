import { useCallback } from 'react';

import { type StacksTransactionWire } from '@stacks/transactions';

import type { AccountId } from '@leather.io/models';
import { isString } from '@leather.io/utils';

import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { useSubmitTransactionCallback } from '@app/common/hooks/use-submit-stx-transaction';
import { useWalletType } from '@app/common/use-wallet-type';
import { toastDurations, useToast } from '@app/features/toasts/use-toast';
import { LoadingKeys } from '@app/store/ui/ui.hooks';

export function useBroadcastRotationTransaction() {
  const toast = useToast();
  const { whenWallet } = useWalletType();
  const { createNewAccount, switchAccount } = useKeyActions();
  const submitTransaction = useSubmitTransactionCallback({
    loadingKey: LoadingKeys.SUBMIT_STACKS_TRANSACTION,
  });

  return useCallback(
    (signedRotationTx: StacksTransactionWire, targetAccountId: AccountId) =>
      submitTransaction({
        onSuccess() {
          whenWallet({
            software() {
              void createNewAccount(targetAccountId.fingerprint);
            },
            // TODO: test ledger flow
            ledger() {
              switchAccount({
                fingerprint: targetAccountId.fingerprint,
                accountIndex: targetAccountId.accountIndex,
              });
            },
          })();
          toast.success('Moved remaining STX and switched to the fresh account', {
            duration: toastDurations.standard,
          });
        },
        onError(error) {
          const message = isString(error) ? error : error.message;
          toast.error(`Your send went through, but moving remaining STX failed: ${message}`);
        },
      })(signedRotationTx),
    [createNewAccount, submitTransaction, switchAccount, toast, whenWallet]
  );
}
