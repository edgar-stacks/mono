import { useField } from 'formik';

import type { Money } from '@leather.io/models';
import { convertAmountToBaseUnit } from '@leather.io/utils';

import { getBalanceAfterSbtcFee } from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';

import { SendMaxButton } from '../../components/send-max-button';

interface SbtcSponsoredSendMaxButtonProps {
  balance: Money;
}
export function SbtcSponsoredSendMaxButton({ balance }: SbtcSponsoredSendMaxButtonProps) {
  const [feeField] = useField<unknown>('fee');
  const sendMaxBalance = convertAmountToBaseUnit(getBalanceAfterSbtcFee(balance, feeField.value));
  return <SendMaxButton balance={balance} sendMaxBalance={sendMaxBalance.toFixed()} />;
}
