import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { AccountId } from '@leather.io/models';

import { selectStacksChain } from '@app/store/chains/stx-chain.selectors';
import { useActiveWalletType } from '@app/store/common/wallet-type.selectors';
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
  const currentAccount = useCurrentAccountId();
  const walletType = useActiveWalletType();
  const stacksChain = useSelector(selectStacksChain);
  const highestAccountIndex = stacksChain[currentAccount.fingerprint]?.highestAccountIndex;

  const freshAccountIndex =
    walletType === 'software'
      ? (highestAccountIndex ?? currentAccount.accountIndex) + 1
      : currentAccount.accountIndex + 1;

  const freshAccountId = useMemo(
    () => ({ fingerprint: currentAccount.fingerprint, accountIndex: freshAccountIndex }),
    [currentAccount.fingerprint, freshAccountIndex]
  );
  const freshAccount = useStacksAccount(freshAccountId);
  if (walletType === 'software' && highestAccountIndex === undefined) return undefined;
  return freshAccount;
}

export function useFreshStacksAccountAddress() {
  return useFreshStacksAccount()?.address ?? '';
}
