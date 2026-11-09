import { useUserSettings } from '@/hooks/use-user-settings';
import type { StacksTransactionWire } from '@stacks/transactions';
import { skipToken, useQuery } from '@tanstack/react-query';

import { createStacksTransactionFeesQueryConfig } from '@leather.io/queries';

const idleQueryKey = ['stacks-transaction-fees-service--get-stacks-transaction-fees', 'idle'];

export function useStacksTransactionFees(unsignedTx?: StacksTransactionWire) {
  const settings = useUserSettings();
  const config = unsignedTx
    ? createStacksTransactionFeesQueryConfig(unsignedTx, settings)
    : undefined;
  return useQuery({
    ...config,
    queryKey: config?.queryKey ?? idleQueryKey,
    queryFn: config?.queryFn ?? skipToken,
  });
}
