import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { AccountId } from '@leather.io/models';

import { selectStacksChain } from '@app/store/chains/stx-chain.selectors';
import { useInMemoryKeys } from '@app/store/in-memory-key/use-in-memory-keys';
import { type RootState } from '@app/store/store';

import { useCurrentAccountId } from '../../account';
import { selectStacksAccountById, selectStacksAccountState } from './stacks-account.selectors';

export function useStacksAccounts() {
  const { version } = useInMemoryKeys();
  return useSelector((state: RootState) => selectStacksAccountState(state, version));
}

export function useStacksAccount(accountId: AccountId) {
  const { version } = useInMemoryKeys();
  const selector = useCallback(
    (state: RootState) => selectStacksAccountById(state, version, accountId),
    [accountId, version]
  );
  return useSelector(selector);
}

export function useCurrentStacksAccount() {
  const currentAccount = useCurrentAccountId();
  return useStacksAccount(currentAccount);
}

export function useCurrentStacksAccountAddress() {
  return useCurrentStacksAccount()?.address ?? '';
}

function useFreshStacksAccountIndex() {
  const currentAccount = useCurrentStacksAccount();
  const stxChain = useSelector(selectStacksChain);
  if (!currentAccount) return undefined;
  if (currentAccount.type === 'ledger') return currentAccount.accountIndex + 1;
  const highestIndex = stxChain[currentAccount.fingerprint]?.highestAccountIndex;
  if (highestIndex === undefined) return undefined;
  return highestIndex + 1;
}

export function useFreshStacksAccount() {
  const currentAccountId = useCurrentAccountId();
  const freshAccountIndex = useFreshStacksAccountIndex();
  const freshAccountId = useMemo(
    () => ({
      fingerprint: currentAccountId.fingerprint,
      accountIndex: freshAccountIndex ?? currentAccountId.accountIndex,
    }),
    [currentAccountId.fingerprint, currentAccountId.accountIndex, freshAccountIndex]
  );
  const freshAccount = useStacksAccount(freshAccountId);
  return freshAccountIndex === undefined ? undefined : freshAccount;
}
