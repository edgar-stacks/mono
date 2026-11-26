import { describe, expect, test } from 'vitest';

import { isHexString } from './is-hex-string';

describe('isHexString', () => {
  test.each(['1f2a', '1F2a', '1F2A', 'a'])('returns true for hex %s', value => {
    expect(isHexString(value)).toBe(true);
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

  test('returns false for hex with one non-hex character', () => {
    expect(isHexString('1g')).toBe(false);
  });

  test('returns false for hex followed by a newline', () => {
    expect(isHexString('1f\n')).toBe(false);
  });
});
