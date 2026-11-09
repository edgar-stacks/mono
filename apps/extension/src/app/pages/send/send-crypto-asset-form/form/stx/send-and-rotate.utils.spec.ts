import { calculateRotationAmount } from './send-and-rotate.utils';

describe(calculateRotationAmount.name, () => {
  test('returns the balance left after the send and both fees', () => {
    expect(
      calculateRotationAmount({ availableBalance: 1000000, amount: 400000, feePerTransfer: 3000 })
    ).toEqual(594000);
  });

  test('returns a non-positive amount when nothing is left to move', () => {
    expect(
      calculateRotationAmount({ availableBalance: 10000, amount: 4000, feePerTransfer: 3000 })
    ).toBeLessThanOrEqual(0);
  });
});
