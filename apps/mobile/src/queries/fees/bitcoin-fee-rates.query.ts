import { useUserSettings } from '@/hooks/use-user-settings';
import { useQuery } from '@tanstack/react-query';

import { createBitcoinFeeRatesQueryConfig } from '@leather.io/queries';

interface BitcoinFeeRate {
  rate: number;
}

export interface BitcoinFeeRates {
  low: BitcoinFeeRate;
  standard: BitcoinFeeRate;
  high: BitcoinFeeRate;
}

export function useBitcoinFeeRates() {
  const settings = useUserSettings();
  return useQuery<BitcoinFeeRates>(createBitcoinFeeRatesQueryConfig(settings));
}
