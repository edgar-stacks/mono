import BigNumber from 'bignumber.js';

import { increaseValueByOneMicroStx, sumNumbers } from './helpers';

const cases = [
  {
    sums: [1, 2, 3],
    expectedResult: new BigNumber(6),
  },
  {
    sums: [0.1, 0.2],
    expectedResult: new BigNumber(0.3),
  },
  {
    sums: [Number.MAX_SAFE_INTEGER, 1],
    expectedResult: new BigNumber('9007199254740992'),
  },
];

describe(sumNumbers.name, () => {
  describe.each(cases)('Sum example', ({ sums, expectedResult }) => {
    test('sum of ' + sums.toString(), () => {
      expect(sumNumbers(sums).toString()).toEqual(expectedResult.toString());
    });
  });
});

describe(increaseValueByOneMicroStx.name, () => {
  test('adds one micro-STX to zero', () => {
    expect(increaseValueByOneMicroStx(0)).toBe(0.000001);
  });

  test('adds one micro-STX to one micro-STX', () => {
    expect(increaseValueByOneMicroStx(0.000001)).toBe(0.000002);
  });

  test('rounds a value at six decimals up to the next whole STX', () => {
    expect(increaseValueByOneMicroStx(1.999999)).toBe(2);
  });

  test('accepts a BigNumber', () => {
    expect(increaseValueByOneMicroStx(new BigNumber('1.5'))).toBe(1.500001);
  });
});
