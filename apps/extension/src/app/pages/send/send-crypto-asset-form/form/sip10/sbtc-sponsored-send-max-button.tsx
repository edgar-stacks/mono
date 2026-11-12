import { useField } from 'formik';

import type { Money, StacksTransactionFees } from '@leather.io/models';
import { convertAmountToBaseUnit } from '@leather.io/utils';

import { getSbtcSponsoredBalanceLessFee } from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';

import { SendMaxButton } from '../../components/send-max-button';

interface SbtcSponsoredSendMaxButtonProps {
  balance: Money;
  fees?: StacksTransactionFees;
}
export function SbtcSponsoredSendMaxButton({ balance, fees }: SbtcSponsoredSendMaxButtonProps) {
  const [feeTypeField] = useField<string>('feeType');
  const balanceLessFee = getSbtcSponsoredBalanceLessFee(balance, fees, feeTypeField.value);
  return (
    <SendMaxButton
      balance={balance}
      sendMaxBalance={convertAmountToBaseUnit(balanceLessFee).toString()}
    />
  );
}
