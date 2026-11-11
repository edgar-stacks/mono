import BigNumber from 'bignumber.js';

import { createMoney } from './create-money';
import { isMoney } from './is-money';

describe(isMoney.name, () => {
  test('returns false for null', () => {
    expect(isMoney(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isMoney(undefined)).toBe(false);
  });

  test('returns true for a Money object', () => {
    expect(isMoney(createMoney(1, 'BTC'))).toBe(true);
  });

  test('returns false for a BigNumber', () => {
    expect(isMoney(new BigNumber(1))).toBe(false);
  });
});
