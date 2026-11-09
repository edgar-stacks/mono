import { getNonceInputError } from './nonce-validators';

describe(getNonceInputError.name, () => {
  it('accepts an unset nonce', () => {
    expect(getNonceInputError(undefined)).toBeUndefined();
  });

  it('accepts zero and positive integers', () => {
    expect(getNonceInputError(0)).toBeUndefined();
    expect(getNonceInputError('12')).toBeUndefined();
  });

  it('rejects an empty value', () => {
    expect(getNonceInputError('')).toEqual('Nonce must be a positive integer or 0');
  });

  it('rejects a decimal', () => {
    expect(getNonceInputError('1.5')).toEqual('nonce must be an integer');
  });

  it('rejects a negative number', () => {
    expect(getNonceInputError('-1')).toEqual('Nonce must be zero or more');
  });
});
