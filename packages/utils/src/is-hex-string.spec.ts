import { describe, expect, test } from 'vitest';

import { isHexString } from './is-hex-string';

describe(isHexString.name, () => {
  test('accepts plain lowercase hex', () => {
    expect(isHexString('1f2a')).toBe(true);
  });

  test('accepts plain uppercase hex', () => {
    expect(isHexString('1F2A')).toBe(true);
  });

  test('accepts mixed case hex', () => {
    expect(isHexString('1F2a')).toBe(true);
  });

  test('accepts a bare 8-character fingerprint', () => {
    expect(isHexString('deadBEEF')).toBe(true);
  });

  test('rejects a 0x prefix', () => {
    expect(isHexString('0x1f')).toBe(false);
  });

  test('rejects the empty string', () => {
    expect(isHexString('')).toBe(false);
  });

  test('rejects non-hex characters', () => {
    expect(isHexString('xyz')).toBe(false);
  });

  test('rejects hex with surrounding whitespace', () => {
    expect(isHexString(' 1f ')).toBe(false);
  });

  test('rejects hex followed by a newline', () => {
    expect(isHexString('1f\n')).toBe(false);
  });
});
