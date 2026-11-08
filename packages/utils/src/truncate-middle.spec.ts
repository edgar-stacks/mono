import { truncateMiddle } from './truncate-middle';

describe(truncateMiddle.name, () => {
  test('returns an empty string unchanged', () => {
    expect(truncateMiddle('')).toEqual('');
  });

  test('keeps the 0x prefix plus the offset on the left of a hex string', () => {
    expect(truncateMiddle('0x1234567890abcdef')).toEqual('0x12345…bcdef');
  });

  test('truncates only the address part of a contract id and keeps the name', () => {
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.usda-token')).toEqual(
      'SP2C2…89YZR.usda-token'
    );
  });

  test('keeps offset characters on each side of any other string', () => {
    expect(truncateMiddle('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')).toEqual('bc1qx…x0wlh');
  });

  test('respects a custom offset', () => {
    expect(truncateMiddle('abcdefghij', 3)).toEqual('abc…hij');
    expect(truncateMiddle('0x1234567890abcdef', 3)).toEqual('0x123…def');
    expect(truncateMiddle('SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.usda-token', 3)).toEqual(
      'SP2…YZR.usda-token'
    );
  });
});
