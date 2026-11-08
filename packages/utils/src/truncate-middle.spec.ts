import { truncateMiddle } from './truncate-middle';

describe(truncateMiddle.name, () => {
  test('returns an empty string unchanged', () => {
    expect(truncateMiddle('')).toEqual('');
  });

  test('keeps 0x plus the offset on the left and the offset on the right of hex', () => {
    expect(truncateMiddle('0x1234567890abcdef')).toEqual('0x12345…bcdef');
  });

  test('truncates only the address part of a contract id and keeps the name', () => {
    expect(truncateMiddle('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.my-contract')).toEqual(
      'SP2J6…V9EJ7.my-contract'
    );
  });

  test('keeps offset characters on each side of any other string', () => {
    expect(truncateMiddle('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')).toEqual('bc1qx…x0wlh');
  });

  test('uses a custom offset', () => {
    expect(truncateMiddle('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 3)).toEqual('bc1…wlh');
    expect(truncateMiddle('0x1234567890abcdef', 3)).toEqual('0x123…def');
    expect(truncateMiddle('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.my-contract', 3)).toEqual(
      'SP2…EJ7.my-contract'
    );
  });
});
