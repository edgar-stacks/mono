import BigNumber from 'bignumber.js';
import { useField } from 'formik';

import type { MarketData, StacksTransactionFees } from '@leather.io/models';
import {
  baseCurrencyAmountInQuote,
  createMoneyFromDecimal,
  isNumber,
  isString,
} from '@leather.io/utils';

import { FeesRow } from '@app/components/fees-row/fees-row';
import { sbtcFeeCurrency } from '@app/features/sbtc-sponsorship/sbtc-sponsorship.utils';
import { SponsoredFeeBadge } from '@app/features/sbtc-sponsorship/sponsored-fee-badge';

interface SbtcSponsoredFeesRowProps {
  fees?: StacksTransactionFees;
  decimals: number;
  marketData?: MarketData;
}
export function SbtcSponsoredFeesRow({ fees, decimals, marketData }: SbtcSponsoredFeesRowProps) {
  const [feeField] = useField<unknown>('fee');

  function getFeeFiatValue() {
    if (!marketData) return null;
    if (!isNumber(feeField.value) && !isString(feeField.value)) return null;
    if (feeField.value === '') return null;
    return baseCurrencyAmountInQuote(
      createMoneyFromDecimal(new BigNumber(feeField.value), sbtcFeeCurrency, decimals),
      marketData
    );
  }

  return (
    <FeesRow
      fees={fees}
      isSponsored={false}
      allowCustom={false}
      feeBadge={<SponsoredFeeBadge />}
      feeFiatValue={getFeeFiatValue()}
    />
  );
}
