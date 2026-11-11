import BigNumber from 'bignumber.js';

import { countDecimals, increaseValueByOneMicroStx, sumNumbers } from './helpers';

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

describe(countDecimals.name, () => {
  test('counts the decimals of an amount', () => {
    expect(countDecimals('1.5')).toEqual(1);
    expect(countDecimals('1.123456789')).toEqual(9);
    expect(countDecimals('10')).toEqual(0);
    expect(countDecimals('0.' + '1'.repeat(30))).toEqual(30);
  });

  test('leaves the global BigNumber config unchanged', () => {
    const decimalPlacesBefore = BigNumber.config().DECIMAL_PLACES;
    countDecimals('1.123456789');
    expect(BigNumber.config().DECIMAL_PLACES).toEqual(decimalPlacesBefore);
  });
});

describe(increaseValueByOneMicroStx.name, () => {
  test('adds one micro-STX', () => {
    expect(increaseValueByOneMicroStx(0)).toEqual(0.000001);
    expect(increaseValueByOneMicroStx(0.000001)).toEqual(0.000002);
    expect(increaseValueByOneMicroStx(1.999999)).toEqual(2);
    expect(increaseValueByOneMicroStx(new BigNumber('1.5'))).toEqual(1.500001);
  });
});
