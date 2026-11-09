import { useStacksTransactionFees } from '@/queries/stacks/fees/stacks-transaction-fees.query';
import { useStacksSigners } from '@/store/keychains/stacks/stacks-keychains.read';
import { useNetworkPreferenceStacksNetwork } from '@/store/settings/settings';
import { bytesToHex } from '@noble/hashes/utils';
import { type StacksTransactionWire, deserializeTransaction } from '@stacks/transactions';
import { skipToken, useQuery } from '@tanstack/react-query';

import { type AccountId, type Sip10Asset, type StacksTransactionFees } from '@leather.io/models';
import {
  TransactionTypes,
  createTransferSip10TxHex,
  generateStacksUnsignedTransaction,
} from '@leather.io/stacks';
import { createMoney } from '@leather.io/utils';

const placeholderNonce = 0;
const placeholderAmount = 0;

interface StacksTransferFeesResult {
  data: StacksTransactionFees | undefined;
  isPending: boolean;
  isError: boolean;
}

function useStacksTransferFees(
  placeholderTxKey: unknown[],
  createPlaceholderTx: (() => Promise<StacksTransactionWire>) | undefined
): StacksTransferFeesResult {
  const placeholderTx = useQuery({
    queryKey: ['stacks-placeholder-transfer-tx', ...placeholderTxKey],
    queryFn: createPlaceholderTx ?? skipToken,
    staleTime: Infinity,
  });
  const fees = useStacksTransactionFees(placeholderTx.data);

  return {
    data: fees.data,
    isPending: !placeholderTx.isError && fees.isPending,
    isError: placeholderTx.isError || fees.isError,
  };
}

function useAccountStacksSigner(account: AccountId) {
  return useStacksSigners().fromAccountIndex(account.fingerprint, account.accountIndex)[0];
}

export function useStxTransferFees(account: AccountId) {
  const signer = useAccountStacksSigner(account);
  const network = useNetworkPreferenceStacksNetwork();

  return useStacksTransferFees(
    ['stx', signer?.address, network.chainId],
    signer &&
      (() =>
        generateStacksUnsignedTransaction({
          txType: TransactionTypes.StxTokenTransfer,
          amount: createMoney(placeholderAmount, 'STX'),
          fee: createMoney(0, 'STX'),
          nonce: placeholderNonce,
          recipient: signer.address,
          memo: '',
          network,
          publicKey: bytesToHex(signer.publicKey),
        }))
  );
}

export function useSip10TransferFees(account: AccountId, asset: Sip10Asset) {
  const signer = useAccountStacksSigner(account);
  const network = useNetworkPreferenceStacksNetwork();

  return useStacksTransferFees(
    ['sip10', signer?.address, network.chainId, asset.assetId],
    signer &&
      (async () =>
        deserializeTransaction(
          await createTransferSip10TxHex({
            signer,
            assetId: asset.assetId,
            recipient: signer.address,
            amount: placeholderAmount,
            nonce: placeholderNonce,
            fee: createMoney(0, 'STX'),
          })
        ))
  );
}
