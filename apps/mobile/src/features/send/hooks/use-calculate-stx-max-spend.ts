import { useCallback } from 'react';

import BigNumber from 'bignumber.js';

import { STX_DECIMALS } from '@leather.io/constants';
import { type Money } from '@leather.io/models';
import { convertAmountToBaseUnit, stxToMicroStx } from '@leather.io/utils';

export type CalculateStxMaxSpend = ReturnType<typeof useCalculateStxMaxSpend>;

export function useCalculateStxMaxSpend(availableBalance: Money, standardFee: Money) {
  return useCallback(
    ({ fee = convertAmountToBaseUnit(standardFee) } = {}) => {
      const result = availableBalance.amount.minus(stxToMicroStx(fee));
      return convertAmountToBaseUnit(BigNumber.max(result, 0), STX_DECIMALS);
    },

    [availableBalance, standardFee]
  );
}
