import { describe, expect, test } from 'vitest';

import { isHexString } from './is-hex-string';

describe('isHexString', () => {
  test('returns true for plain lowercase hex', () => {
    expect(isHexString('1f2a')).toBe(true);
  });

  test('returns true for mixed case hex', () => {
    expect(isHexString('1F2a')).toBe(true);
  });

  test('returns false for 0x-prefixed hex', () => {
    expect(isHexString('0x1f')).toBe(false);
  });

  test('returns false for the empty string', () => {
    expect(isHexString('')).toBe(false);
  });

  test('returns false for non-hex characters', () => {
    expect(isHexString('xyz')).toBe(false);
  });
});
