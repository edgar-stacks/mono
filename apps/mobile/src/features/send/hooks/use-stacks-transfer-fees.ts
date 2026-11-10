import { useMemo } from 'react';

import { stxFormValuesToSerializedTransaction } from '@/features/send/utils';
import { useStacksTransactionFees } from '@/queries/stacks/fees/stacks-transaction-fees.query';
import { useStacksSigners } from '@/store/keychains/stacks/stacks-keychains.read';
import { assertStacksSigner } from '@/store/keychains/stacks/utils';
import { useNetworkPreferenceStacksNetwork } from '@/store/settings/settings';
import { deserializeTransaction } from '@stacks/transactions';
import { type QueryKey, useQuery } from '@tanstack/react-query';

import { type AccountId, type Sip10Asset } from '@leather.io/models';
import { createTransferSip10TxHex } from '@leather.io/stacks';
import { createMoney, isDefined } from '@leather.io/utils';

const placeholderAmount = 0;
const placeholderNonce = 0;
const placeholderFee = 0;

interface PlaceholderTransferTxOptions {
  queryKey: QueryKey;
  enabled: boolean;
  queryFn(): Promise<string>;
}

function usePlaceholderTransferFees({ queryKey, enabled, queryFn }: PlaceholderTransferTxOptions) {
  const placeholderTxHex = useQuery({ queryKey, queryFn, enabled, staleTime: Infinity });
  const placeholderTx = useMemo(
    () => (placeholderTxHex.data ? deserializeTransaction(placeholderTxHex.data) : undefined),
    [placeholderTxHex.data]
  );
  const fees = useStacksTransactionFees(placeholderTx);

  return {
    data: fees.data,
    status: placeholderTxHex.status === 'error' ? placeholderTxHex.status : fees.status,
  };
}

function useStacksSigner({ fingerprint, accountIndex }: AccountId) {
  return useStacksSigners().fromAccountIndex(fingerprint, accountIndex)[0];
}

export function useStxTransferFees(account: AccountId) {
  const signer = useStacksSigner(account);
  const network = useNetworkPreferenceStacksNetwork();

  return usePlaceholderTransferFees({
    queryKey: ['stx-transfer-fees--placeholder-tx', signer?.address, network],
    enabled: isDefined(signer),
    queryFn() {
      assertStacksSigner(signer);
      return stxFormValuesToSerializedTransaction(
        {
          amount: String(placeholderAmount),
          fee: placeholderFee,
          memo: '',
          nonce: placeholderNonce,
          recipient: signer.address,
          isSendingMax: false,
        },
        signer.publicKey,
        network
      );
    },
  });
}

export function useSip10TransferFees(account: AccountId, asset: Sip10Asset) {
  const signer = useStacksSigner(account);

  return usePlaceholderTransferFees({
    queryKey: ['sip10-transfer-fees--placeholder-tx', signer?.address, asset.assetId],
    enabled: isDefined(signer),
    queryFn() {
      assertStacksSigner(signer);
      return createTransferSip10TxHex({
        signer,
        assetId: asset.assetId,
        recipient: signer.address,
        amount: placeholderAmount,
        nonce: placeholderNonce,
        fee: createMoney(placeholderFee, 'STX'),
      });
    },
  });
}
