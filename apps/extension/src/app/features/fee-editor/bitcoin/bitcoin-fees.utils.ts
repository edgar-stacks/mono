import {
  type DetermineUtxosForSpendArgs,
  determineUtxosForSpend,
  determineUtxosForSpendAll,
} from '@leather.io/bitcoin';
import type { OwnedUtxo } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import type { Fee, FeePriority, Fees } from '../fee-editor.context';

export function getBitcoinFee(determineUtxosForFeeArgs: DetermineUtxosForSpendArgs<OwnedUtxo>) {
  try {
    const { fee } = determineUtxosForSpend(determineUtxosForFeeArgs);
    return fee;
  } catch {
    return null;
  }
}

export function getBitcoinSendMaxFee(
  determineUtxosForFeeArgs: DetermineUtxosForSpendArgs<OwnedUtxo>
) {
  try {
    const { fee } = determineUtxosForSpendAll(determineUtxosForFeeArgs);
    return fee;
  } catch {
    return null;
  }
}

function createZeroBitcoinFee(priority: FeePriority): Fee {
  return { priority, feeRate: 0, txFee: createMoney(0, 'BTC'), time: '' };
}

export function createZeroBitcoinFees(): Fees {
  return {
    slow: createZeroBitcoinFee('slow'),
    standard: createZeroBitcoinFee('standard'),
    fast: createZeroBitcoinFee('fast'),
    custom: createZeroBitcoinFee('custom'),
  };
}
