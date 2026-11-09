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

function useFreshStacksAccountId(): AccountId | undefined {
  const currentAccountId = useCurrentAccountId();
  const walletType = useActiveWalletType();
  const stacksChain = useSelector(selectStacksChain);

  return useMemo(() => {
    const { fingerprint, accountIndex } = currentAccountId;
    if (walletType === 'ledger') return { fingerprint, accountIndex: accountIndex + 1 };
    if (walletType !== 'software') return;
    const highestAccountIndex = stacksChain[fingerprint]?.highestAccountIndex;
    if (highestAccountIndex === undefined) return;
    return { fingerprint, accountIndex: highestAccountIndex + 1 };
  }, [currentAccountId, walletType, stacksChain]);
}

export function useFreshStacksAccount() {
  const { version } = useInMemoryKeys();
  const accountId = useFreshStacksAccountId();
  const selector = useCallback(
    (state: RootState) =>
      accountId ? selectStacksAccountById(state, version, accountId) : undefined,
    [accountId, version]
  );
  return useSelector(selector);
}
