import {
  type CoinSelectionRecipient,
  type InputData,
  calculateMaxSpendWithinInputLimit,
  countUtxosForSpend,
} from '@leather.io/bitcoin';
import { LEDGER_BITCOIN_MAX_INPUTS } from '@leather.io/constants';
import type { Money } from '@leather.io/models';
import { sumMoney } from '@leather.io/utils';

interface GetLedgerBitcoinInputLimitArgs {
  recipients: CoinSelectionRecipient[];
  utxos: InputData[];
  feeRate?: number;
  isSendMax?: boolean;
}

export interface LedgerBitcoinInputLimit {
  inputCount: number | null;
  exceedsLimit: boolean;
  maxAmountWithinLimit: Money | null;
}

const emptyLedgerBitcoinInputLimit: LedgerBitcoinInputLimit = {
  inputCount: null,
  exceedsLimit: false,
  maxAmountWithinLimit: null,
};

export function getLedgerBitcoinInputLimit({
  recipients,
  utxos,
  feeRate,
  isSendMax = false,
}: GetLedgerBitcoinInputLimitArgs): LedgerBitcoinInputLimit {
  if (!feeRate || !utxos.length || !recipients.length) return emptyLedgerBitcoinInputLimit;

  const hasAmount = sumMoney(recipients.map(recipient => recipient.amount)).amount.isGreaterThan(0);
  if (!hasAmount && !isSendMax) return emptyLedgerBitcoinInputLimit;

  const args = { recipients, utxos, feeRate };
  const inputCount = isSendMax
    ? countUtxosForSpend({ ...args, isSendMax: true })
    : (countUtxosForSpend(args) ?? countUtxosForSpend({ ...args, isSendMax: true }));

  if (inputCount === null) return emptyLedgerBitcoinInputLimit;

  const exceedsLimit = inputCount > LEDGER_BITCOIN_MAX_INPUTS;
  if (!exceedsLimit) return { inputCount, exceedsLimit, maxAmountWithinLimit: null };

  const { amount } = calculateMaxSpendWithinInputLimit({
    recipient: recipients[0].address,
    utxos,
    feeRate,
    maxInputs: LEDGER_BITCOIN_MAX_INPUTS,
  });

  return { inputCount, exceedsLimit, maxAmountWithinLimit: amount };
}

export function assertLedgerBitcoinInputLimit(inputCount: number) {
  if (inputCount > LEDGER_BITCOIN_MAX_INPUTS)
    throw new Error(
      `Ledger can sign at most ${LEDGER_BITCOIN_MAX_INPUTS} inputs per transaction, but this transaction has ${inputCount}`
    );
}
