import { describe, expect, it } from 'vitest';

import { isObject } from './type-guards';

describe(isObject.name, () => {
  it('returns false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isObject(undefined)).toBe(false);
  });

  it('returns true for objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });

  it('returns true for arrays', () => {
    expect(isObject([])).toBe(true);
    expect(isObject([1, 2])).toBe(true);
  });

  it('returns false for primitives', () => {
    expect(isObject(0)).toBe(false);
    expect(isObject('a')).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(1n)).toBe(false);
    expect(isObject(Symbol('a'))).toBe(false);
  });
});
