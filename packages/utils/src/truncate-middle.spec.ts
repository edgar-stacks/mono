import { truncateMiddle } from './truncate-middle';

describe(truncateMiddle.name, () => {
  test('returns an empty string unchanged', () => {
    expect(truncateMiddle('')).toEqual('');
  });

  test('keeps 0x plus the offset on the left and the offset on the right of a hex string', () => {
    expect(truncateMiddle('0x1234567890abcdef')).toEqual('0x1234…cdef');
  });

  test('truncates only the address part of a contract id and keeps the contract name', () => {
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token')).toEqual(
      'SP2C…9YZR.arkadiko-token'
    );
  });

  test('keeps the offset on each side of any other string', () => {
    expect(truncateMiddle('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')).toEqual('bc1q…0wlh');
  });

  test('keeps 4 characters on each side of a Stacks address by default', () => {
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR')).toEqual('SP2C…9YZR');
  });

  test('uses a custom offset', () => {
    expect(truncateMiddle('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 6)).toEqual(
      'bc1qxy…hx0wlh'
    );
    expect(truncateMiddle('0x1234567890abcdef', 2)).toEqual('0x12…ef');
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token', 6)).toEqual(
      'SP2C2Y…Z89YZR.arkadiko-token'
    );
  });
});
