import { useState } from 'react';
import { useAsync } from 'react-async-hook';
import { useNavigate } from 'react-router';

import {
  type StacksTransactionWire,
  broadcastTransaction,
  deserializeTransaction,
} from '@stacks/transactions';
import { useQuery } from '@tanstack/react-query';

import {
  getHiroStacksApiClient,
  getHttpCacheService,
  getStacksTransactionFeesService,
} from '@leather.io/services';
import { createMoney, isError } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { RouteUrls } from '@shared/route-urls';

import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { queryClient } from '@app/common/persistence';
import { useWalletType } from '@app/common/use-wallet-type';
import { isLedgerSigningCancelledError } from '@app/features/ledger/flow/unwrap-ledger-signing-outcome';
import { useToast } from '@app/features/toasts/use-toast';
import { useStxAccountBalance } from '@app/query/stacks/balance/stx-balance.hooks';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useSip10AddressTransferableTokenBalances } from '@app/query/stacks/sip10/sip10-balance.hooks';
import { hiroFetchWrapper } from '@app/query/stacks/stacks-client';
import { useAppDispatch } from '@app/store';
import { useCurrentAccountId } from '@app/store/accounts/account';
import {
  useCurrentStacksAccount,
  useFreshStacksAccount,
} from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { userSwitchesAccount } from '@app/store/active/active.slice';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import { describeNft } from './move-to-fresh-account-nfts';
import { type MoveTransaction, buildMovePlan } from './move-to-fresh-account.utils';

const maxNftPages = 50;
const bnsNamesRefreshDelayMs = 60_000;
const bnsNamesQueryPrefix = 'bns-service--get-account-bns-names';

const cancelledMessage = 'Signing was cancelled. Nothing was sent.';
const successMessage = 'Moved your Stacks assets and switched to the fresh account';

async function refreshBnsNames() {
  await getHttpCacheService().clear('bns-v2-api-address-names');
  await queryClient.invalidateQueries({ queryKey: [bnsNamesQueryPrefix] });
}

function getErrorMessage(error: unknown) {
  return isError(error) ? error.message : String(error);
}

export function useMoveToFreshAccount() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { walletType, whenWallet } = useWalletType();
  const { createNewAccount } = useKeyActions();
  const signTransaction = useSignStacksTransaction({ settleOnRejection: true });
  const network = useCurrentStacksNetworkState();
  const policy = useCurrentPolicy();
  const currentAccountId = useCurrentAccountId();
  const sender = useCurrentStacksAccount();
  const freshAccount = useFreshStacksAccount();
  const [isMoving, setIsMoving] = useState(false);

  const senderAddress = sender?.address ?? '';
  const freshAddress = freshAccount?.address ?? '';

  const balance = useStxAccountBalance(currentAccountId);
  const tokens = useSip10AddressTransferableTokenBalances(senderAddress);
  const senderNonce = useNextNonce(senderAddress);
  const freshNonce = useNextNonce(freshAddress);

  const nftsQuery = useQuery({
    queryKey: ['move-to-fresh-account-nfts', senderAddress, network.client.baseUrl],
    async queryFn({ signal }) {
      const holdings = await getHiroStacksApiClient().getPrincipalNftBalances(
        senderAddress,
        { maxPages: maxNftPages },
        { signal }
      );
      return Promise.all(
        holdings.map(holding => describeNft(holding, { network, senderAddress, signal }))
      );
    },
    enabled: !!senderAddress,
    refetchOnWindowFocus: false,
  });

  const nfts = nftsQuery.data ?? [];
  const movableNfts = nfts.filter(nft => nft.status === 'move');
  const stayingNfts = nfts.filter(nft => nft.status === 'stay');

  const isFreshAccountAvailable =
    !!freshAccount &&
    !policy &&
    freshAccount.address !== senderAddress &&
    freshNonce.data?.nonce === 0;

  const stx = balance.value?.stx;
  const firstNonce = senderNonce.data?.nonce;

  const isLoadingInputs =
    balance.state === 'loading' ||
    tokens.isLoading ||
    nftsQuery.isLoading ||
    senderNonce.isLoading ||
    (!!freshAddress && freshNonce.isLoading);

  const canBuildPlan =
    isFreshAccountAvailable && !isLoadingInputs && !nftsQuery.isError && firstNonce !== undefined;

  const planKey = [
    canBuildPlan,
    senderAddress,
    freshAddress,
    firstNonce,
    stx?.availableUnlockedBalance.amount.toString(),
    ...tokens.sip10s.map(t => `${t.asset.assetId}:${t.crypto.availableBalance.amount.toString()}`),
    ...movableNfts.map(nft => `${nft.assetIdentifier}:${nft.valueHex}`),
    network.client.baseUrl,
  ].join('|');

  const planState = useAsync(async () => {
    if (!canBuildPlan || !sender || !stx || firstNonce === undefined) return undefined;
    return buildMovePlan({
      senderAddress,
      publicKey: sender.stxPublicKey,
      recipient: freshAddress,
      network,
      firstNonce,
      availableStx: stx.availableUnlockedBalance,
      sip10s: tokens.sip10s,
      nfts: movableNfts,
      async estimateFee(tx: StacksTransactionWire) {
        const fees = await getStacksTransactionFeesService().getStacksTransactionFees(tx);
        return fees.options.standard.value;
      },
    });
  }, [planKey]);

  async function signAll(transactions: MoveTransaction[]) {
    const signed: StacksTransactionWire[] = [];
    for (const { tx } of transactions) {
      const signedTx = await signTransaction(deserializeTransaction(tx.serialize()));
      if (!signedTx) return null;
      signed.push(signedTx);
    }
    return signed;
  }

  async function broadcast(tx: StacksTransactionWire) {
    try {
      const response = await broadcastTransaction({
        transaction: tx,
        network,
        client: { fetch: hiroFetchWrapper },
      });
      if ('error' in response) return response.reason;
      return null;
    } catch (error) {
      return getErrorMessage(error);
    }
  }

  function switchToFreshAccount() {
    if (!freshAccount) return;
    whenWallet({
      software() {
        void createNewAccount(freshAccount.fingerprint);
      },
      ledger() {
        dispatch(
          userSwitchesAccount({
            fingerprint: freshAccount.fingerprint,
            accountIndex: freshAccount.accountIndex,
          })
        );
      },
    })();
  }

  async function move() {
    const plan = planState.result;
    if (plan?.status !== 'ready' || isMoving) return;
    setIsMoving(true);

    try {
      const signed = await signAll(plan.transactions);
      if (!signed) {
        toast.error(cancelledMessage);
        return;
      }

      for (const [index, tx] of signed.entries()) {
        const error = await broadcast(tx);
        if (error) {
          logger.error('Move to fresh account stopped on a failed broadcast', { index, error });
          toast.error(`Sent ${index} of ${signed.length} transactions, then stopped: ${error}`);
          return;
        }
      }

      if (movableNfts.length > 0) {
        void refreshBnsNames();
        setTimeout(() => void refreshBnsNames(), bnsNamesRefreshDelayMs);
      }

      switchToFreshAccount();
      toast.success(successMessage);
      void navigate(RouteUrls.Home);
    } catch (error) {
      if (isLedgerSigningCancelledError(error)) {
        toast.error(cancelledMessage);
        return;
      }
      logger.error('Move to fresh account failed', error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsMoving(false);
    }
  }

  return {
    walletType,
    freshAccount,
    isFreshAccountAvailable,
    isLoading: isLoadingInputs || (canBuildPlan && planState.loading),
    hasError: balance.state === 'error' || nftsQuery.isError || !!planState.error,
    plan: planState.result,
    sip10s: tokens.sip10s,
    movableNfts,
    stayingNfts,
    lockedStx: stx?.lockedBalance ?? createMoney(0, 'STX'),
    isMoving,
    move,
  };
}
