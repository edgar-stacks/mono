import { isObject } from './type-guards';

describe(isObject.name, () => {
  test('returns false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isObject(undefined)).toBe(false);
  });

  test('returns true for plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ key: 'value' })).toBe(true);
  });

  test('returns true for arrays', () => {
    expect(isObject([])).toBe(true);
    expect(isObject([1, 2, 3])).toBe(true);
  });

  test('returns false for primitives', () => {
    expect(isObject('string')).toBe(false);
    expect(isObject(1)).toBe(false);
    expect(isObject(BigInt(1))).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(Symbol('symbol'))).toBe(false);
  });
});
