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

function useStacksRotationTargetAccountId(): AccountId | undefined {
  const currentAccountId = useCurrentAccountId();
  const walletType = useActiveWalletType();
  const stacksChain = useSelector(selectStacksChain);
  const fingerprint = currentAccountId?.fingerprint;
  const currentAccountIndex = currentAccountId?.accountIndex;
  const highestAccountIndex = fingerprint
    ? stacksChain[fingerprint]?.highestAccountIndex
    : undefined;

  return useMemo(() => {
    if (!fingerprint || currentAccountIndex === undefined) return;
    if (walletType === 'ledger') return { fingerprint, accountIndex: currentAccountIndex + 1 };
    if (walletType === 'software' && highestAccountIndex !== undefined)
      return { fingerprint, accountIndex: highestAccountIndex + 1 };
    return;
  }, [fingerprint, currentAccountIndex, walletType, highestAccountIndex]);
}

export function useStacksRotationTargetAccount() {
  const { version } = useInMemoryKeys();
  const targetAccountId = useStacksRotationTargetAccountId();
  const selector = useCallback(
    (state: RootState) =>
      targetAccountId ? selectStacksAccountById(state, version, targetAccountId) : undefined,
    [targetAccountId, version]
  );
  return useSelector(selector);
}
