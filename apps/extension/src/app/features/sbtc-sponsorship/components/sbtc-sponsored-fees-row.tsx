import { useMemo } from 'react';

import BigNumber from 'bignumber.js';
import { useField } from 'formik';

import type { MarketData, StacksTransactionFees } from '@leather.io/models';
import {
  baseCurrencyAmountInQuote,
  createMoney,
  isNumber,
  isString,
  unitToFractionalUnit,
} from '@leather.io/utils';

import { FeesRow } from '@app/components/fees-row/fees-row';

import { sbtcFeeSymbol } from '../sbtc-sponsorship.utils';
import { SponsoredFeeBadge } from './sponsored-fee-badge';
import { SyncFeeCurrency } from './sync-fee-currency';

interface SbtcSponsoredFeesRowProps {
  decimals: number;
  fees?: StacksTransactionFees;
  marketData?: MarketData;
}
export function SbtcSponsoredFeesRow({ decimals, fees, marketData }: SbtcSponsoredFeesRowProps) {
  const [feeField] = useField<unknown>('fee');
  const [feeCurrencyField] = useField<string>('feeCurrency');

  const feeFiatValue = useMemo(() => {
    if (!marketData) return null;
    if (!isNumber(feeField.value) && !isString(feeField.value)) return null;
    const fee = new BigNumber(feeField.value);
    if (fee.isNaN()) return null;
    return baseCurrencyAmountInQuote(
      createMoney(unitToFractionalUnit(decimals)(fee), marketData.pair.base, decimals),
      marketData
    );
  }, [decimals, feeField.value, marketData]);

  return (
    <>
      <SyncFeeCurrency currency={sbtcFeeSymbol} />
      <FeesRow
        allowCustom={false}
        feeBadge={<SponsoredFeeBadge />}
        feeFiatValue={feeFiatValue}
        fees={feeCurrencyField.value === sbtcFeeSymbol ? fees : undefined}
        isSponsored={false}
      />
    </>
  );
}
