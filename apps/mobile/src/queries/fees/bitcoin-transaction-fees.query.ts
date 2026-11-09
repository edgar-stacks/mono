import { useUserSettings } from '@/hooks/use-user-settings';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { type BitcoinTransactionFees } from '@leather.io/models';
import {
  type BitcoinTransactionFeesParams,
  createBitcoinTransactionFeesQueryConfig,
} from '@leather.io/queries';

interface UseBitcoinTransactionFeesParams extends BitcoinTransactionFeesParams {
  enabled?: boolean;
}

export function useBitcoinTransactionFees({
  account,
  recipients,
  isMaxSpend,
  enabled = true,
}: UseBitcoinTransactionFeesParams): UseQueryResult<BitcoinTransactionFees> {
  const settings = useUserSettings();

  return useQuery({
    ...createBitcoinTransactionFeesQueryConfig({ account, recipients, isMaxSpend }, settings),
    enabled,
  });
}
