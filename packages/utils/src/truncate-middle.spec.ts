import { describe, expect, it } from 'vitest';

import { truncateMiddle } from './truncate-middle';

describe(truncateMiddle.name, () => {
  it('keeps 4 characters on each side by default', () => {
    expect(truncateMiddle('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7')).toEqual('SP2J…9EJ7');
  });

  it('keeps 4 characters on each side of a contract address by default', () => {
    expect(truncateMiddle('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.token')).toEqual(
      'SP2J…9EJ7.token'
    );
  });

  it('keeps the 0x prefix and 4 characters on each side of a hex string by default', () => {
    expect(truncateMiddle('0x1234567890abcdef')).toEqual('0x1234…cdef');
  });

  it('uses an explicit offset when given', () => {
    expect(truncateMiddle('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', 6)).toEqual('SP2J6Z…RV9EJ7');
  });

  it('returns an empty input unchanged', () => {
    expect(truncateMiddle('')).toEqual('');
  });
});
