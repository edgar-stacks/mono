import { createMoney } from '@leather.io/utils';

import { calculateStxToMove } from './move-to-fresh-account.utils';

describe(calculateStxToMove.name, () => {
  it('subtracts every fee from the available balance', () => {
    const available = createMoney(1_000_000, 'STX');
    const fees = [createMoney(1_000, 'STX'), createMoney(2_000, 'STX'), createMoney(3_000, 'STX')];

    expect(calculateStxToMove(available, fees).amount.toNumber()).toEqual(994_000);
  });

  it('returns the available balance when there are no fees', () => {
    const available = createMoney(1_000_000, 'STX');

    expect(calculateStxToMove(available, []).amount.toNumber()).toEqual(1_000_000);
  });

  it('returns zero when the fees use the full balance', () => {
    const available = createMoney(3_000, 'STX');
    const fees = [createMoney(1_000, 'STX'), createMoney(2_000, 'STX')];

    expect(calculateStxToMove(available, fees).amount.isGreaterThan(0)).toBe(false);
  });

  it('returns a negative value when the fees exceed the balance', () => {
    const available = createMoney(1_000, 'STX');
    const fees = [createMoney(1_000, 'STX'), createMoney(2_000, 'STX')];

    expect(calculateStxToMove(available, fees).amount.toNumber()).toEqual(-2_000);
  });
});
