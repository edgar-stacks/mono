import { useStacksTransactionFees } from '@/queries/stacks/fees/stacks-transaction-fees.query';
import { useStacksSigners } from '@/store/keychains/stacks/stacks-keychains.read';
import { useNetworkPreferenceStacksNetwork } from '@/store/settings/settings';
import { bytesToHex } from '@noble/hashes/utils';
import { type StacksTransactionWire, deserializeTransaction } from '@stacks/transactions';
import { type QueryStatus, type UseQueryResult, skipToken, useQuery } from '@tanstack/react-query';

import { type AccountId, type Sip10Asset, type StacksTransactionFees } from '@leather.io/models';
import {
  TransactionTypes,
  createTransferSip10TxHex,
  generateStacksUnsignedTransaction,
} from '@leather.io/stacks';
import { createMoney } from '@leather.io/utils';

const placeholderNonce = 0;
const placeholderAmount = 0;

interface StacksTransferFees {
  status: QueryStatus;
  data: StacksTransactionFees | undefined;
}

function useAccountStacksSigner(account: AccountId) {
  return useStacksSigners().fromAccountIndex(account.fingerprint, account.accountIndex)[0];
}

function useTransferFees(placeholderTx: UseQueryResult<StacksTransactionWire>): StacksTransferFees {
  const fees = useStacksTransactionFees(placeholderTx.data);
  if (placeholderTx.status === 'error') return { status: 'error', data: undefined };
  return { status: fees.status, data: fees.data };
}

export function useStxTransferFees(account: AccountId) {
  const signer = useAccountStacksSigner(account);
  const network = useNetworkPreferenceStacksNetwork();
  const placeholderTx = useQuery({
    queryKey: ['stx-transfer-fees-placeholder-tx', signer?.address, network.chainId],
    queryFn: signer
      ? () =>
          generateStacksUnsignedTransaction({
            txType: TransactionTypes.StxTokenTransfer,
            amount: createMoney(placeholderAmount, 'STX'),
            fee: createMoney(0, 'STX'),
            nonce: placeholderNonce,
            recipient: signer.address,
            memo: '',
            network,
            publicKey: bytesToHex(signer.publicKey),
          })
      : skipToken,
    staleTime: Infinity,
  });
  return useTransferFees(placeholderTx);
}

export function useSip10TransferFees(account: AccountId, asset: Sip10Asset) {
  const signer = useAccountStacksSigner(account);
  const placeholderTx = useQuery({
    queryKey: ['sip10-transfer-fees-placeholder-tx', signer?.address, asset.assetId],
    queryFn: signer
      ? async () =>
          deserializeTransaction(
            await createTransferSip10TxHex({
              signer,
              assetId: asset.assetId,
              recipient: signer.address,
              amount: placeholderAmount,
              nonce: placeholderNonce,
              fee: createMoney(0, 'STX'),
            })
          )
      : skipToken,
    staleTime: Infinity,
  });
  return useTransferFees(placeholderTx);
}
