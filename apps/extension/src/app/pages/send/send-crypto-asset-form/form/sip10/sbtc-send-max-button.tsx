import { useField } from 'formik';

import type { Money } from '@leather.io/models';
import { convertAmountToBaseUnit } from '@leather.io/utils';

import {
  parseFeeFormValue,
  subtractFeeFromBalance,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';

import { SendMaxButton } from '../../components/send-max-button';

interface SbtcSendMaxButtonProps {
  balance: Money;
}
export function SbtcSendMaxButton({ balance }: SbtcSendMaxButtonProps) {
  const [feeField] = useField<unknown>('fee');
  const spendableBalance = subtractFeeFromBalance(
    balance,
    parseFeeFormValue(feeField.value, balance.decimals)
  );
  return (
    <SendMaxButton
      balance={spendableBalance}
      sendMaxBalance={convertAmountToBaseUnit(spendableBalance).toFixed()}
    />
  );
}
