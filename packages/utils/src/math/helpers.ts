import BigNumber from 'bignumber.js';

import { STX_DECIMALS } from '@leather.io/constants';

import { isBigInt } from '../type-guards';

const oneMicroStx = new BigNumber(1).shiftedBy(-STX_DECIMALS);

export function initBigNumber(num: string | number | BigNumber | bigint) {
  if (BigNumber.isBigNumber(num)) return num;
  return isBigInt(num) ? new BigNumber(num.toString()) : new BigNumber(num);
}

export function sumNumbers(nums: number[]) {
  return nums.reduce((acc, num) => acc.plus(num), new BigNumber(0));
}

function isMultipleOf(multiple: number) {
  return (num: number) => num % multiple === 0;
}

export function isEven(num: number) {
  return isMultipleOf(2)(num);
}

export function countDecimals(num: string | number | BigNumber) {
  return initBigNumber(num).decimalPlaces() ?? 0;
}

export function increaseValueByOneMicroStx(value: string | number | BigNumber) {
  return new BigNumber(value).plus(oneMicroStx).toNumber();
}
