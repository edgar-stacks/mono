import { createMoney } from './create-money';
import { isMoneyGreaterThanZero } from './is-money';

describe(isMoneyGreaterThanZero.name, () => {
  test('returns false for a negative amount', () => {
    expect(isMoneyGreaterThanZero(createMoney(-1, 'STX'))).toBe(false);
  });

  test('returns false for a zero amount', () => {
    expect(isMoneyGreaterThanZero(createMoney(0, 'STX'))).toBe(false);
  });

  test('returns false for a NaN amount', () => {
    expect(isMoneyGreaterThanZero(createMoney(NaN, 'STX'))).toBe(false);
  });

  test('returns true for a small positive amount', () => {
    expect(isMoneyGreaterThanZero(createMoney(0.00000001, 'BTC'))).toBe(true);
  });
});
