import type { Money } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { BitcoinError } from '../validation/bitcoin-error';
import {
  type DetermineUtxosForSpendArgs,
  determineUtxosForSpend,
  determineUtxosForSpendAll,
} from './coin-selection';
import {
  type InputData,
  type InputSizing,
  filterUneconomicalUtxos,
  getSpendableAmount,
} from './coin-selection.utils';

interface CalculateMaxSpendWithinInputLimitArgs {
  recipient: string;
  utxos: InputData[];
  feeRate: number;
  maxInputs: number;
  inputSizing?: InputSizing;
}

export interface MaxSpendWithinInputLimit {
  amount: Money;
  fee: number;
  inputCount: number;
  economicalInputCount: number;
}

export function calculateMaxSpendWithinInputLimit({
  recipient,
  utxos,
  feeRate,
  maxInputs,
  inputSizing,
}: CalculateMaxSpendWithinInputLimitArgs): MaxSpendWithinInputLimit {
  const emptySpend = {
    amount: createMoney(0, 'BTC'),
    fee: 0,
    inputCount: 0,
    economicalInputCount: 0,
  };
  if (!utxos.length || feeRate <= 0 || maxInputs <= 0) return emptySpend;

  const recipients = [{ address: recipient, amount: createMoney(0, 'BTC') }];

  const economicalUtxos = filterUneconomicalUtxos({
    utxos: [...utxos],
    feeRate,
    recipients,
    inputSizing,
  });
  if (!economicalUtxos.length) return emptySpend;

  const selectedUtxos = [...economicalUtxos].sort((a, b) => b.value - a.value).slice(0, maxInputs);

  const { spendableAmount, fee } = getSpendableAmount({
    utxos: selectedUtxos,
    feeRate,
    recipients,
    inputSizing,
  });

  return {
    amount: createMoney(spendableAmount, 'BTC'),
    fee,
    inputCount: selectedUtxos.length,
    economicalInputCount: economicalUtxos.length,
  };
}

interface CountUtxosForSpendArgs<T> extends DetermineUtxosForSpendArgs<T> {
  isSendMax?: boolean;
}

export function countUtxosForSpend<T extends InputData>({
  isSendMax,
  utxos,
  ...args
}: CountUtxosForSpendArgs<T>) {
  try {
    const { inputs } = isSendMax
      ? determineUtxosForSpendAll({ ...args, utxos: [...utxos] })
      : determineUtxosForSpend({ ...args, utxos: [...utxos] });
    return inputs.length;
  } catch (error) {
    if (error instanceof BitcoinError) return null;
    throw error;
  }
}
