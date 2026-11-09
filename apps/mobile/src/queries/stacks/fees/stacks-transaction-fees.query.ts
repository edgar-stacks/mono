import { useUserSettings } from '@/hooks/use-user-settings';
import type { StacksTransactionWire } from '@stacks/transactions';
import { type UseQueryResult, skipToken, useQuery } from '@tanstack/react-query';

import { type StacksTransactionFees } from '@leather.io/models';
import { createStacksTransactionFeesQueryConfig } from '@leather.io/queries';

const idleStacksTransactionFeesQueryKey = ['stacks-transaction-fees-service--idle'];

export function useStacksTransactionFees(
  unsignedTx?: StacksTransactionWire
): UseQueryResult<StacksTransactionFees> {
  const settings = useUserSettings();

  return useQuery(
    unsignedTx
      ? createStacksTransactionFeesQueryConfig(unsignedTx, settings)
      : { queryKey: idleStacksTransactionFeesQueryKey, queryFn: skipToken }
  );
}
