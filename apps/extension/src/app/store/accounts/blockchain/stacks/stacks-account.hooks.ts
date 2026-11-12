import { useCallback } from 'react';
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

export function useFreshStacksAccount() {
  const { version } = useInMemoryKeys();
  const currentAccount = useCurrentStacksAccount();
  const stxChain = useSelector(selectStacksChain);

  const fingerprint = currentAccount?.fingerprint;
  const highestAccountIndex = fingerprint ? stxChain[fingerprint]?.highestAccountIndex : undefined;
  const freshAccountIndex =
    currentAccount?.type === 'software'
      ? (highestAccountIndex ?? currentAccount.accountIndex) + 1
      : currentAccount && currentAccount.accountIndex + 1;

  const selector = useCallback(
    (state: RootState) => {
      if (!fingerprint || freshAccountIndex === undefined) return undefined;
      return selectStacksAccountById(state, version, {
        fingerprint,
        accountIndex: freshAccountIndex,
      });
    },
    [fingerprint, freshAccountIndex, version]
  );
  return useSelector(selector);
}

export function useFreshStacksAccountAddress() {
  return useFreshStacksAccount()?.address ?? '';
}
