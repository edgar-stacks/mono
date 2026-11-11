import { calculateRotationAmount } from './send-and-rotate.utils';

describe(calculateRotationAmount.name, () => {
  test('returns the available balance minus the amount and both fees', () => {
    const rotationAmount = calculateRotationAmount({
      availableBalance: 1000000,
      amount: 400000,
      feePerTransfer: 3000,
    });
    expect(rotationAmount.toNumber()).toEqual(594000);
  });

  test('returns a non-positive amount when nothing is left to move', () => {
    const rotationAmount = calculateRotationAmount({
      availableBalance: 10000,
      amount: 4000,
      feePerTransfer: 3000,
    });
    expect(rotationAmount.isGreaterThan(0)).toBe(false);
  });
});
