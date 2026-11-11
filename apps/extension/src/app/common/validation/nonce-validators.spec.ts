import { getNonceInputError } from './nonce-validators';

describe(getNonceInputError.name, () => {
  it('accepts an unset nonce', () => {
    expect(getNonceInputError(undefined)).toBeUndefined();
  });

  it('accepts zero and positive integers', () => {
    expect(getNonceInputError('0')).toBeUndefined();
    expect(getNonceInputError(12)).toBeUndefined();
  });

  it('rejects an empty input', () => {
    expect(getNonceInputError('')).toBe('Nonce must be a positive integer or 0');
  });

  it('rejects a decimal nonce', () => {
    expect(getNonceInputError('1.5')).toBe('nonce must be an integer');
  });

  it('rejects a negative nonce', () => {
    expect(getNonceInputError('-1')).toBe('Nonce must be zero or more');
  });
});
