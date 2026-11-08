import { describe, expect, test } from 'vitest';

import { truncateMiddle } from './truncate-middle';

describe(truncateMiddle.name, () => {
  test('returns an empty string unchanged', () => {
    expect(truncateMiddle('')).toBe('');
  });

  test('keeps 0x plus the offset on the left and the offset on the right of hex', () => {
    expect(truncateMiddle('0x1234567890abcdef')).toBe('0x12345…bcdef');
  });

  test('truncates only the address part of a contract id and keeps the name', () => {
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token')).toBe(
      'SP2C2…89YZR.arkadiko-token'
    );
  });

  test('keeps offset characters on each side of any other string', () => {
    expect(truncateMiddle('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')).toBe('bc1qx…x0wlh');
  });

  test('uses a custom offset', () => {
    expect(truncateMiddle('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 3)).toBe('bc1…wlh');
    expect(truncateMiddle('0x1234567890abcdef', 3)).toBe('0x123…def');
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token', 3)).toBe(
      'SP2…YZR.arkadiko-token'
    );
  });
});
