import { useMemo } from 'react';

import { useWalletType } from '@app/common/use-wallet-type';
import { useFeeEditorContext } from '@app/features/fee-editor/fee-editor.context';
import { getLedgerBitcoinInputLimit } from '@app/features/ledger/utils/ledger-bitcoin-input-limit';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

import { useRpcSendTransferContext } from './rpc-send-transfer.context';

export function useRpcSendTransferLedgerInputLimit() {
  const { selectedFee } = useFeeEditorContext();
  const { amount, recipients, utxos } = useRpcSendTransferContext();
  const policy = useCurrentPolicy();
  const { walletType } = useWalletType();
  const isBitcoinPolicy = policy?.chain === 'bitcoin';
  const feeRate = selectedFee?.feeRate;

  return useMemo(() => {
    if (walletType !== 'ledger' || isBitcoinPolicy) return null;
    return getLedgerBitcoinInputLimit({ amount, feeRate, recipients, utxos });
  }, [walletType, isBitcoinPolicy, amount, feeRate, recipients, utxos]);
}
