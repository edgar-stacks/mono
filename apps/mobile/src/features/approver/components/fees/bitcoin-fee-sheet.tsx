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

export function BitcoinFeesSheet({
  sheetRef,
  selectedFeeType,
  fees,
  currentFee,
  currentFeeRate,
  onChangeFee,
}: FeesSheetProps) {
  const { data: btcMarketData } = useBtcMarketDataQuery();

  function convertFeeToQuote(fee: Money) {
    return baseCurrencyAmountInQuoteWithFallback(fee, btcMarketData);
  }

  function getFee(feeType: FeeTypes) {
    const quote = {
      [FeeTypes.Low]: fees?.options.low,
      [FeeTypes.Middle]: fees?.options.standard,
      [FeeTypes.High]: fees?.options.high,
      [FeeTypes.Unknown]: undefined,
      [FeeTypes.Custom]: { value: currentFee, rate: currentFeeRate },
    }[feeType];
    return { feeRate: quote?.rate ?? 0, fee: quote?.value ?? createMoney(0, 'BTC') };
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
            fee={fee.amount.toNumber()}
            quoteFee={convertFeeToQuote(fee)}
          />
        );
      })}
    </FeeSheetLayout>
  );
}
