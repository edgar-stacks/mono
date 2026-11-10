import {
  type CoinSelectionRecipient,
  type InputData,
  type InputSizing,
  calculateMaxSpendWithinInputLimit,
  countUtxosForSpend,
} from '@leather.io/bitcoin';
import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import type { Money } from '@leather.io/models';
import { sumMoney } from '@leather.io/utils';

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

interface GetLedgerBitcoinInputLimitArgs<T extends InputData> {
  recipients: CoinSelectionRecipient[];
  utxos: T[];
  feeRate?: number;
  isSendMax?: boolean;
  inputSizing?: InputSizing;
}

export function getLedgerBitcoinInputLimit<T extends InputData>({
  recipients,
  utxos,
  feeRate,
  isSendMax,
  inputSizing,
}: GetLedgerBitcoinInputLimitArgs<T>): LedgerBitcoinInputLimit {
  const [firstRecipient] = recipients;
  if (!feeRate || !utxos.length || !firstRecipient) return emptyLedgerBitcoinInputLimit;

  const amount = sumMoney(recipients.map(recipient => recipient.amount));
  if (!isSendMax && !amount.amount.isGreaterThan(0)) return emptyLedgerBitcoinInputLimit;

  const coinSelectionArgs = { feeRate, recipients, utxos, inputSizing };
  const inputCount =
    (isSendMax ? null : countUtxosForSpend(coinSelectionArgs)) ??
    countUtxosForSpend({ ...coinSelectionArgs, isSendMax: true }) ??
    0;

  const exceedsLimit = inputCount > LEDGER_BITCOIN_MAX_INPUTS;
  if (!exceedsLimit) return { inputCount, exceedsLimit, maxAmountWithinLimit: null };

  const { amount: maxAmountWithinLimit } = calculateMaxSpendWithinInputLimit({
    recipient: firstRecipient.address,
    utxos,
    feeRate,
    maxInputs: LEDGER_BITCOIN_MAX_INPUTS,
    inputSizing,
  });

  return { inputCount, exceedsLimit, maxAmountWithinLimit };
}

export function exceedsLedgerBitcoinInputLimit(inputCount: number) {
  return inputCount > LEDGER_BITCOIN_MAX_INPUTS;
}

export function assertLedgerBitcoinInputLimit(inputCount: number) {
  if (exceedsLedgerBitcoinInputLimit(inputCount))
    throw new Error(
      `Ledger can sign at most ${LEDGER_BITCOIN_MAX_INPUTS} inputs per transaction, but this transaction has ${inputCount}`
    );
}
