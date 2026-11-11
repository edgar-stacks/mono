import BigNumber from 'bignumber.js';

import { type Money } from '@leather.io/models';

export function isMoney(val: unknown) {
  return (
    typeof val === 'object' &&
    val !== null &&
    'amount' in val &&
    'symbol' in val &&
    'decimals' in val
  );
}

export function isMoneyGreaterThanZero(money: Money) {
  if (!BigNumber.isBigNumber(money.amount)) return;
  return !(money.amount.isNaN() || money.amount.isZero());
}
