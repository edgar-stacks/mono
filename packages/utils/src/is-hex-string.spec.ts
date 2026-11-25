import { isHexString } from './is-hex-string';

describe(isHexString.name, () => {
  test('accepts plain lowercase hex', () => {
    expect(isHexString('1f2a')).toBe(true);
  });

  test('accepts plain uppercase hex', () => {
    expect(isHexString('1F2A')).toBe(true);
  });

  test('accepts all-uppercase hex letters', () => {
    expect(isHexString('ABCDEF')).toBe(true);
  });

  test('accepts mixed case hex', () => {
    expect(isHexString('1F2a')).toBe(true);
  });

  test('accepts a bare 8-character fingerprint', () => {
    expect(isHexString('a1b2c3d4')).toBe(true);
  });

  test('rejects a 0x prefix', () => {
    expect(isHexString('0x1f')).toBe(false);
  });

  test('rejects an uppercase 0X prefix', () => {
    expect(isHexString('0X1f')).toBe(false);
  });

  test('rejects the empty string', () => {
    expect(isHexString('')).toBe(false);
  });

  test('rejects non-hex characters', () => {
    expect(isHexString('xyz')).toBe(false);
  });

  test('rejects hex with a non-hex character mixed in', () => {
    expect(isHexString('1f2g')).toBe(false);
  });

  test('rejects surrounding whitespace', () => {
    expect(isHexString(' 1f2a ')).toBe(false);
  });
});
