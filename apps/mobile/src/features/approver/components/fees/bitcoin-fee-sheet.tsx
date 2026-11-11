import { useBtcMarketDataQuery } from '@/queries/market-data/btc-market-data.query';

import { type BitcoinTransactionFees, FeeTypes, type Money } from '@leather.io/models';
import { type SheetRef } from '@leather.io/ui/native';
import { baseCurrencyAmountInQuoteWithFallback, createMoney } from '@leather.io/utils';

import { BitcoinFeeOption } from './bitcoin-fee-option';
import { FeeSheetLayout } from './fee-sheet.layout';

const feeTypes = [FeeTypes.Low, FeeTypes.Middle, FeeTypes.High, FeeTypes.Custom];

interface FeesSheetProps {
  sheetRef: SheetRef;
  selectedFeeType: FeeTypes;
  fees: BitcoinTransactionFees | undefined;
  currentFee: Money;
  currentFeeRate: number;
  onChangeFee(feeType: FeeTypes): void;
}

function toFeeOption(value: Money, feeRate: number) {
  return { feeRate, fee: value.amount.toNumber() };
}

export function BitcoinFeesSheet({
  sheetRef,
  selectedFeeType,
  fees,
  currentFee,
  currentFeeRate,
  onChangeFee,
}: FeesSheetProps) {
  const { data: btcMarketData } = useBtcMarketDataQuery();

  function convertFeeToQuote(fee: number) {
    return baseCurrencyAmountInQuoteWithFallback(createMoney(fee, 'BTC'), btcMarketData);
  }

  function getFee(feeType: FeeTypes) {
    const zeroFee = { feeRate: 0, fee: 0 };
    return {
      [FeeTypes.Low]: fees ? toFeeOption(fees.options.low.value, fees.options.low.rate) : zeroFee,
      [FeeTypes.Middle]: fees
        ? toFeeOption(fees.options.standard.value, fees.options.standard.rate)
        : zeroFee,
      [FeeTypes.High]: fees
        ? toFeeOption(fees.options.high.value, fees.options.high.rate)
        : zeroFee,
      [FeeTypes.Unknown]: zeroFee,
      [FeeTypes.Custom]: toFeeOption(currentFee, currentFeeRate),
    }[feeType];
  }

  function handleFeeChange(feeType: FeeTypes) {
    onChangeFee(feeType);
    sheetRef.current?.close();
  }

  return (
    <FeeSheetLayout sheetRef={sheetRef}>
      {feeTypes.map(feeType => {
        const { feeRate, fee } = getFee(feeType);
        return (
          <BitcoinFeeOption
            isSelected={selectedFeeType === feeType}
            disabled={feeType === FeeTypes.Custom}
            onPress={() => handleFeeChange(feeType)}
            key={feeType}
            feeType={feeType}
            feeRate={feeRate}
            fee={fee}
            quoteFee={convertFeeToQuote(fee)}
          />
        );
      })}
    </FeeSheetLayout>
  );
}
