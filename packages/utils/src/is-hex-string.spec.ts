import { describe, expect, test } from 'vitest';

import { isHexString } from './is-hex-string';

describe('isHexString', () => {
  test.each([
    { label: 'plain lowercase', value: '1f2a' },
    { label: 'plain uppercase', value: '1F2A' },
    { label: 'mixed case', value: '1F2a' },
  ])('accepts $label hex', ({ value }) => {
    expect(isHexString(value)).toBe(true);
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

  test('rejects hex followed by a newline', () => {
    expect(isHexString('1f\n')).toBe(false);
  });
});
