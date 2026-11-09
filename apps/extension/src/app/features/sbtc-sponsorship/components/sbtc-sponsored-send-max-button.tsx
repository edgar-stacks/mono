import BigNumber from 'bignumber.js';

import type { Money } from '@leather.io/models';
import { convertAmountToBaseUnit, createMoney } from '@leather.io/utils';

import { SendMaxButton } from '@app/pages/send/send-crypto-asset-form/components/send-max-button';

import { type SbtcSponsorshipFees } from '../sbtc-sponsorship.utils';
import { useSelectedSbtcSponsorshipFee } from '../use-selected-sbtc-sponsorship-fee';

interface SbtcSponsoredSendMaxButtonProps {
  balance: Money;
  fees: SbtcSponsorshipFees;
}
export function SbtcSponsoredSendMaxButton({ balance, fees }: SbtcSponsoredSendMaxButtonProps) {
  const { fee } = useSelectedSbtcSponsorshipFee(fees);
  const maxAmount = BigNumber.max(balance.amount.minus(fee.amount), 0);
  const sendMaxBalance = convertAmountToBaseUnit(
    createMoney(maxAmount, balance.symbol, balance.decimals)
  ).toString();

  return <SendMaxButton balance={balance} sendMaxBalance={sendMaxBalance} />;
}
