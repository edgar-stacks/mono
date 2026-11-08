import { truncateMiddle } from './truncate-middle';

describe(truncateMiddle.name, () => {
  test('returns an empty string unchanged', () => {
    expect(truncateMiddle('')).toEqual('');
  });

  test('keeps the 0x prefix plus the offset on the left of a hex string', () => {
    expect(truncateMiddle('0x1234567890abcdef')).toEqual('0x12345…bcdef');
  });

  test('truncates only the address part of a contract id', () => {
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token')).toEqual(
      'SP2C2…89YZR.arkadiko-token'
    );
  });

  test('keeps offset characters on each side of any other string', () => {
    expect(truncateMiddle('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')).toEqual('bc1qx…x0wlh');
  });

  test('uses a custom offset', () => {
    expect(truncateMiddle('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 3)).toEqual('bc1…wlh');
    expect(truncateMiddle('0x1234567890abcdef', 3)).toEqual('0x123…def');
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token', 3)).toEqual(
      'SP2…YZR.arkadiko-token'
    );
  });
});
