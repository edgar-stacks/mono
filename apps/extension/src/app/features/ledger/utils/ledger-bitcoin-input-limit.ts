import {
  type InputData,
  type InputSizing,
  calculateMaxSpendWithinInputLimit,
  countUtxosForSpend,
} from '@leather.io/bitcoin';
import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import type { Money } from '@leather.io/models';

import type { WalletType } from '@app/store/common/wallet-type.selectors';

interface GetLedgerBitcoinInputLimitArgs {
  recipient: string;
  amount: Money;
  utxos: InputData[];
  feeRate?: number;
  isSendMax?: boolean;
  inputSizing?: InputSizing;
}

export interface LedgerBitcoinInputLimit {
  inputCount: number;
  exceedsLimit: boolean;
  maxAmountWithinLimit: Money | null;
}

const emptyLedgerBitcoinInputLimit: LedgerBitcoinInputLimit = {
  inputCount: 0,
  exceedsLimit: false,
  maxAmountWithinLimit: null,
};

export function getLedgerBitcoinInputLimit({
  recipient,
  amount,
  utxos,
  feeRate,
  isSendMax,
  inputSizing,
}: GetLedgerBitcoinInputLimitArgs): LedgerBitcoinInputLimit {
  if (!feeRate || !utxos.length) return emptyLedgerBitcoinInputLimit;
  if (!isSendMax && !amount.amount.isGreaterThan(0)) return emptyLedgerBitcoinInputLimit;

  const coinSelectionArgs = {
    feeRate,
    recipients: [{ address: recipient, amount }],
    utxos,
    inputSizing,
  };

  const inputCount =
    countUtxosForSpend({ ...coinSelectionArgs, isSendMax }) ??
    countUtxosForSpend({ ...coinSelectionArgs, isSendMax: true });

  if (inputCount === null) return emptyLedgerBitcoinInputLimit;

  const exceedsLimit = inputCount > LEDGER_BITCOIN_MAX_INPUTS;

  return {
    inputCount,
    exceedsLimit,
    maxAmountWithinLimit: exceedsLimit
      ? calculateMaxSpendWithinInputLimit({
          recipient,
          utxos,
          feeRate,
          maxInputs: LEDGER_BITCOIN_MAX_INPUTS,
          inputSizing,
        }).amount
      : null,
  };
}

export function assertLedgerBitcoinInputLimit(inputCount: number) {
  if (inputCount > LEDGER_BITCOIN_MAX_INPUTS)
    throw new Error(
      `Ledger can sign at most ${LEDGER_BITCOIN_MAX_INPUTS} inputs per transaction, but this transaction has ${inputCount}`
    );
}

interface IsPsbtOverLedgerInputLimitArgs {
  walletType?: WalletType;
  inputCount: number;
  isBondProposal: boolean;
}

export function isPsbtOverLedgerInputLimit({
  walletType,
  inputCount,
  isBondProposal,
}: IsPsbtOverLedgerInputLimitArgs) {
  if (walletType !== 'ledger' || isBondProposal) return false;
  return inputCount > LEDGER_BITCOIN_MAX_INPUTS;
}
