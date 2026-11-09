import { getNonceInputError } from './nonce-validators';

describe(getNonceInputError.name, () => {
  it('passes when the nonce is unset', () => {
    expect(getNonceInputError(undefined)).toBeUndefined();
  });

  it('rejects an empty nonce', () => {
    expect(getNonceInputError('')).toEqual('Nonce must be a positive integer or 0');
  });

  it('rejects a decimal nonce', () => {
    expect(getNonceInputError('1.5')).toEqual('nonce must be an integer');
  });

  it('rejects a negative nonce', () => {
    expect(getNonceInputError('-1')).toEqual('Nonce must be zero or more');
  });

  it('passes a valid nonce', () => {
    expect(getNonceInputError(3)).toBeUndefined();
  });
});
