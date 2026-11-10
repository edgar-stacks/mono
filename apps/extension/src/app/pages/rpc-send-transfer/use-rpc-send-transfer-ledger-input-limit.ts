import { useMemo } from 'react';

import { useWalletType } from '@app/common/use-wallet-type';
import { useFeeEditorContext } from '@app/features/fee-editor/fee-editor.context';
import { getLedgerBitcoinInputLimit } from '@app/features/ledger/utils/ledger-bitcoin-input-limit';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

import { useRpcSendTransferContext } from './rpc-send-transfer.context';

export function useRpcSendTransferLedgerInputLimit() {
  const { selectedFee } = useFeeEditorContext();
  const { recipients, utxos } = useRpcSendTransferContext();
  const { walletType } = useWalletType();
  const policy = useCurrentPolicy();
  const isBitcoinPolicy = policy?.chain === 'bitcoin';
  const feeRate = selectedFee?.feeRate;

  return useMemo(() => {
    if (walletType !== 'ledger' || isBitcoinPolicy) return null;
    const inputLimit = getLedgerBitcoinInputLimit({ recipients, utxos, feeRate });
    return inputLimit.exceedsLimit ? inputLimit : null;
  }, [walletType, isBitcoinPolicy, recipients, utxos, feeRate]);
}
