import BigNumber from 'bignumber.js';
import { isPlainObject, mapValues } from 'remeda';

function readMoney(value: object) {
  if (!('amount' in value) || !('decimals' in value) || !('symbol' in value)) return undefined;
  const { amount, decimals, symbol } = value;
  if (!BigNumber.isBigNumber(amount) || typeof decimals !== 'number') return undefined;
  if (typeof symbol !== 'string') return undefined;
  return {
    amount: amount.toFixed(),
    decimals,
    symbol,
    value: amount.shiftedBy(-decimals).toFixed(),
  };
}

export function toJsonSafe(value: unknown): unknown {
  if (BigNumber.isBigNumber(value)) return value.toFixed();
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (typeof value === 'object' && value !== null) {
    const money = readMoney(value);
    if (money) return money;
    if (isPlainObject(value)) return mapValues(value, toJsonSafe);
  }
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  return value;
}
