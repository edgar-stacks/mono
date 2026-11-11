import type BigNumber from 'bignumber.js';

import { initBigNumber } from '@leather.io/utils';

const numberOfRotationTransfers = 2;

interface CalculateRotationAmountArgs {
  availableBalance: BigNumber | number | string;
  amount: BigNumber | number | string;
  feePerTransfer: BigNumber | number | string;
}
export function calculateRotationAmount({
  availableBalance,
  amount,
  feePerTransfer,
}: CalculateRotationAmountArgs) {
  return initBigNumber(availableBalance)
    .minus(amount)
    .minus(initBigNumber(feePerTransfer).multipliedBy(numberOfRotationTransfers));
}
