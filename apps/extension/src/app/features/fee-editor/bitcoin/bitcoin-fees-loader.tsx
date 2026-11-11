import { BitcoinError } from '@leather.io/bitcoin';
import type { OwnedUtxo } from '@leather.io/models';
import type { AccountRequest } from '@leather.io/services';
import { createMoney } from '@leather.io/utils';

import type { TransferRecipient } from '@shared/models/form.model';

import { useBitcoinTransactionFees } from '@app/query/bitcoin/fees/bitcoin-transaction-fees.hooks';

import type { Fee, FeePriority, Fees, FeesErrorReason } from '../fee-editor.context';
import { getBitcoinFee, getBitcoinSendMaxFee } from './bitcoin-fees.utils';
import { useBitcoinFees } from './use-bitcoin-fees';

function createZeroValueFee(priority: FeePriority): Fee {
  return { priority, txFee: createMoney(0, 'BTC'), time: '' };
}

function createZeroValueFees(): Fees {
  return {
    slow: createZeroValueFee('slow'),
    standard: createZeroValueFee('standard'),
    fast: createZeroValueFee('fast'),
    custom: createZeroValueFee('custom'),
  };
}

function isInsufficientFundsError(error: unknown) {
  return error instanceof BitcoinError && error.message === 'InsufficientFunds';
}

interface BitcoinFees {
  fees: Fees;
  feesError?: FeesErrorReason;
  isLoading: boolean;
  getCustomFee(rate: number): Fee;
}

interface BitcoinFeesLoaderProps {
  account: AccountRequest;
  children({ fees, feesError, isLoading, getCustomFee }: BitcoinFees): React.ReactNode;
  isSendingMax?: boolean;
  loadingFallback: React.ReactNode;
  recipients: TransferRecipient[];
  utxos: OwnedUtxo[];
}
export function BitcoinFeesLoader({
  account,
  children,
  isSendingMax,
  loadingFallback,
  recipients,
  utxos,
}: BitcoinFeesLoaderProps) {
  const {
    data: feeRates,
    isLoading,
    error,
  } = useBitcoinTransactionFees({
    account,
    recipients,
    isMaxSpend: isSendingMax,
  });
  const fees = useBitcoinFees({ feeRates });

  function getCustomFee(feeRate: number): Fee {
    const determineUtxosForFeeArgs = {
      recipients,
      utxos,
      feeRate,
    };
    const fee = isSendingMax
      ? getBitcoinSendMaxFee(determineUtxosForFeeArgs)
      : getBitcoinFee(determineUtxosForFeeArgs);

    return {
      priority: 'custom',
      feeRate,
      txFee: fee ?? createMoney(0, 'BTC'),
      time: '',
    };
  }
  if (isInsufficientFundsError(error))
    return children({
      fees: fees ?? createZeroValueFees(),
      feesError: 'insufficient-funds',
      isLoading: false,
      getCustomFee,
    });

  if (fees) return children({ fees, isLoading, getCustomFee });

  if (error)
    return children({
      fees: createZeroValueFees(),
      feesError: 'fee-estimation-failed',
      isLoading: false,
      getCustomFee,
    });

  return loadingFallback;
}
