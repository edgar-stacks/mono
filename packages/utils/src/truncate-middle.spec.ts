import { truncateMiddle } from './truncate-middle';

describe(truncateMiddle.name, () => {
  test('returns an empty string unchanged', () => {
    expect(truncateMiddle('')).toEqual('');
  });

  test('keeps 0x plus the offset on the left and the offset on the right of hex', () => {
    expect(truncateMiddle('0x1234567890abcdef')).toEqual('0x12345…bcdef');
  });

  test('truncates only the address part of a contract id and keeps the name', () => {
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token')).toEqual(
      'SP2C2…89YZR.arkadiko-token'
    );
  });

  test('keeps offset characters on each side of any other string', () => {
    expect(truncateMiddle('abcdefghijklmnop')).toEqual('abcde…lmnop');
  });

  test('respects a custom offset', () => {
    expect(truncateMiddle('abcdefghijklmnop', 3)).toEqual('abc…nop');
    expect(truncateMiddle('0x1234567890abcdef', 3)).toEqual('0x123…def');
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token', 3)).toEqual(
      'SP2…YZR.arkadiko-token'
    );
  });
});
