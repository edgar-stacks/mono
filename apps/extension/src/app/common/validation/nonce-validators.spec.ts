import { getNonceInputError } from './nonce-validators';

describe(getNonceInputError.name, () => {
  it('passes when the nonce is unset', () => {
    expect(getNonceInputError(undefined)).toBeUndefined();
  });

  it('passes for zero and positive integers', () => {
    expect(getNonceInputError('0')).toBeUndefined();
    expect(getNonceInputError(12)).toBeUndefined();
  });

  it('reports a type error for an empty string', () => {
    expect(getNonceInputError('')).toEqual('Nonce must be a positive integer or 0');
  });

  it('reports a decimal nonce', () => {
    expect(getNonceInputError('1.5')).toEqual('nonce must be an integer');
  });

  it('reports a negative nonce', () => {
    expect(getNonceInputError('-1')).toEqual('Nonce must be zero or more');
  });
});
