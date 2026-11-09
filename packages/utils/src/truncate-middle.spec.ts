import { truncateMiddle } from './truncate-middle';

describe(truncateMiddle.name, () => {
  test('keeps 4 characters on each side by default', () => {
    expect(truncateMiddle('SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP')).toEqual('SP21…EFFP');
  });

  test('keeps 4 characters on each side of a contract address by default', () => {
    expect(truncateMiddle('SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.contract')).toEqual(
      'SP21…EFFP.contract'
    );
  });

  test('keeps the 0x prefix and 4 characters on each side of a hex string by default', () => {
    expect(truncateMiddle('0x1234567890abcdef')).toEqual('0x1234…cdef');
  });

  test('uses an explicit offset when given', () => {
    expect(truncateMiddle('SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP', 5)).toEqual('SP21Y…XEFFP');
  });

  test('returns an empty input unchanged', () => {
    expect(truncateMiddle('')).toEqual('');
  });
});
