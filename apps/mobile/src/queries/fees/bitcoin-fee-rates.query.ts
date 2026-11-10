import { useUserSettings } from '@/hooks/use-user-settings';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { createBitcoinFeeRatesQueryConfig } from '@leather.io/queries';

interface BitcoinFeeRate {
  rate: number;
}

export interface BitcoinFeeRates {
  low: BitcoinFeeRate;
  standard: BitcoinFeeRate;
  high: BitcoinFeeRate;
}

export function useBitcoinFeeRates(): UseQueryResult<BitcoinFeeRates> {
  const settings = useUserSettings();

  return useQuery({
    ...createBitcoinFeeRatesQueryConfig(settings),
    select(feeRates) {
      return {
        low: { rate: feeRates.low.rate },
        standard: { rate: feeRates.standard.rate },
        high: { rate: feeRates.high.rate },
      };
    },
  });
}
