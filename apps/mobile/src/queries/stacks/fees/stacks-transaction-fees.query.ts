import { useUserSettings } from '@/hooks/use-user-settings';
import { type StacksTransactionWire } from '@stacks/transactions';
import { skipToken, useQuery } from '@tanstack/react-query';

import { createStacksTransactionFeesQueryConfig } from '@leather.io/queries';

const idleStacksTransactionFeesQueryKey = ['stacks-transaction-fees--idle'];

export function useStacksTransactionFees(unsignedTx?: StacksTransactionWire) {
  const settings = useUserSettings();

  return useQuery(
    unsignedTx
      ? createStacksTransactionFeesQueryConfig(unsignedTx, settings)
      : { queryKey: idleStacksTransactionFeesQueryKey, queryFn: skipToken }
  );
}
