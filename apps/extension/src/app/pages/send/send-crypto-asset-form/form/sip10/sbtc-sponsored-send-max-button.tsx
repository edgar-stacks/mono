import { useField } from 'formik';

import type { Money } from '@leather.io/models';
import { convertAmountToBaseUnit } from '@leather.io/utils';

import {
  type SbtcSponsorshipFees,
  getSbtcSponsorshipFeeTier,
  subtractSbtcSponsorshipFee,
} from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';

import { SendMaxButton } from '../../components/send-max-button';

interface SbtcSponsoredSendMaxButtonProps {
  balance: Money;
  fees: SbtcSponsorshipFees;
}
export function SbtcSponsoredSendMaxButton({ balance, fees }: SbtcSponsoredSendMaxButtonProps) {
  const [feeTypeField] = useField<string>('feeType');
  const fee = fees[getSbtcSponsorshipFeeTier(feeTypeField.value)];
  const sendMaxBalance = convertAmountToBaseUnit(subtractSbtcSponsorshipFee(balance, fee));

  return <SendMaxButton balance={balance} sendMaxBalance={sendMaxBalance.toFixed()} />;
}
