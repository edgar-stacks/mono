import { useStacksTransactionFees } from '@/queries/stacks/fees/stacks-transaction-fees.query';
import { useStacksSigners } from '@/store/keychains/stacks/stacks-keychains.read';
import { useNetworkPreferenceStacksNetwork } from '@/store/settings/settings';
import { bytesToHex } from '@noble/hashes/utils';
import { type StacksNetwork } from '@stacks/network';
import { type StacksTransactionWire, deserializeTransaction } from '@stacks/transactions';
import { type UseQueryResult, skipToken, useQuery } from '@tanstack/react-query';

import { type AccountId, type Sip10Asset } from '@leather.io/models';
import {
  type StacksSigner,
  TransactionTypes,
  createTransferSip10TxHex,
  generateStacksUnsignedTransaction,
} from '@leather.io/stacks';
import { createMoney } from '@leather.io/utils';

const placeholderNonce = 0;

function createPlaceholderStxTransfer(signer: StacksSigner, network: StacksNetwork) {
  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.StxTokenTransfer,
    amount: createMoney(0, 'STX'),
    fee: createMoney(0, 'STX'),
    nonce: placeholderNonce,
    recipient: signer.address,
    publicKey: bytesToHex(signer.publicKey),
    network,
  });
}

async function createPlaceholderSip10Transfer(signer: StacksSigner, asset: Sip10Asset) {
  const txHex = await createTransferSip10TxHex({
    signer,
    assetId: asset.assetId,
    recipient: signer.address,
    amount: 0,
    nonce: placeholderNonce,
    fee: createMoney(0, 'STX'),
  });
  return deserializeTransaction(txHex);
}

function useAccountStacksSigner(account: AccountId): StacksSigner | undefined {
  return useStacksSigners().fromAccountIndex(account.fingerprint, account.accountIndex)[0];
}

function useTransferFees(placeholderTx: UseQueryResult<StacksTransactionWire>) {
  const fees = useStacksTransactionFees(placeholderTx.data);
  return {
    data: fees.data,
    isPending: !placeholderTx.isError && fees.isPending,
    isError: placeholderTx.isError || fees.isError,
  };
}

export function useStxTransferFees(account: AccountId) {
  const signer = useAccountStacksSigner(account);
  const network = useNetworkPreferenceStacksNetwork();
  const placeholderTx = useQuery({
    queryKey: ['stx-transfer-fees-placeholder-tx', signer?.address, network.chainId],
    queryFn: signer ? () => createPlaceholderStxTransfer(signer, network) : skipToken,
    staleTime: Infinity,
  });
  return useTransferFees(placeholderTx);
}

export function useSip10TransferFees(account: AccountId, asset: Sip10Asset) {
  const signer = useAccountStacksSigner(account);
  const placeholderTx = useQuery({
    queryKey: ['sip10-transfer-fees-placeholder-tx', signer?.address, asset.assetId],
    queryFn: signer ? () => createPlaceholderSip10Transfer(signer, asset) : skipToken,
    staleTime: Infinity,
  });
  return useTransferFees(placeholderTx);
}
