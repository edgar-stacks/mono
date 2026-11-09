import {
  type CoinSelectionRecipient,
  type InputData,
  type InputSizing,
  calculateMaxSpendWithinInputLimit,
  countUtxosForSpend,
} from '@leather.io/bitcoin';
import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import type { Money } from '@leather.io/models';

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

interface GetLedgerBitcoinInputLimitArgs<T> {
  amount: Money;
  feeRate?: number;
  inputSizing?: InputSizing;
  isSendMax?: boolean;
  recipients: CoinSelectionRecipient[];
  utxos: T[];
}
export function getLedgerBitcoinInputLimit<T extends InputData>({
  amount,
  feeRate,
  inputSizing,
  isSendMax,
  recipients,
  utxos,
}: GetLedgerBitcoinInputLimitArgs<T>): LedgerBitcoinInputLimit {
  if (!feeRate || !utxos.length) return emptyLedgerBitcoinInputLimit;
  if (!isSendMax && !amount.amount.isGreaterThan(0)) return emptyLedgerBitcoinInputLimit;

  const selectionArgs = { feeRate, inputSizing, recipients, utxos };
  const inputCount =
    countUtxosForSpend({ ...selectionArgs, isSendMax }) ??
    countUtxosForSpend({ ...selectionArgs, isSendMax: true });

  if (inputCount === null) return emptyLedgerBitcoinInputLimit;

  const exceedsLimit = inputCount > LEDGER_BITCOIN_MAX_INPUTS;
  const [recipient] = recipients;

  const maxAmountWithinLimit =
    exceedsLimit && recipient && recipients.length === 1
      ? calculateMaxSpendWithinInputLimit({
          recipient: recipient.address,
          utxos,
          feeRate,
          maxInputs: LEDGER_BITCOIN_MAX_INPUTS,
          inputSizing,
        }).amount
      : null;

  return { inputCount, exceedsLimit, maxAmountWithinLimit };
}

export function assertLedgerBitcoinInputLimit(inputCount: number) {
  if (inputCount > LEDGER_BITCOIN_MAX_INPUTS)
    throw new Error(
      `Ledger can sign at most ${LEDGER_BITCOIN_MAX_INPUTS} inputs per transaction, but this transaction has ${inputCount}`
    );
}
