import BigNumber from 'bignumber.js';

import { createMoney } from '@leather.io/utils';

import { stringifyJson } from './stringify-json';

describe(stringifyJson.name, () => {
  test('writes money in display units with its symbol', () => {
    const json = stringifyJson({ balance: createMoney(new BigNumber(150_000), 'BTC') });
    expect(JSON.parse(json)).toEqual({ balance: { amount: '0.0015', symbol: 'BTC' } });
  });

  test('writes bigints and big numbers as strings', () => {
    const json = stringifyJson({ nonce: 12n, slippage: new BigNumber('0.03') });
    expect(JSON.parse(json)).toEqual({ nonce: '12', slippage: '0.03' });
  });
});
