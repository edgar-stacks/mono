import { useState } from 'react';
import { useAsync } from 'react-async-hook';
import { useNavigate } from 'react-router';

import type { StacksNetwork } from '@stacks/network';
import { type StacksTransactionWire, deserializeTransaction } from '@stacks/transactions';
import { useQuery } from '@tanstack/react-query';

import type { Money } from '@leather.io/models';
import {
  getHiroStacksApiClient,
  getHttpCacheService,
  getStacksTransactionFeesService,
} from '@leather.io/services';
import { stacksChainIdToCoreNetworkMode } from '@leather.io/stacks';
import { createMoney, isError, isString } from '@leather.io/utils';

import { RouteUrls } from '@shared/route-urls';

import { useSwitchAccount } from '@app/common/hooks/account/use-switch-account';
import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { queryClient } from '@app/common/persistence';
import { stacksBroadcastTransaction } from '@app/common/transactions/stacks/stacks-broadcast-transaction';
import { isLedgerSigningCancelledError } from '@app/features/ledger/flow/unwrap-ledger-signing-outcome';
import { toastDurations, useToast } from '@app/features/toasts/use-toast';
import { useStxAccountBalance } from '@app/query/stacks/balance/stx-balance.hooks';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useSip10AddressTransferableTokenBalances } from '@app/query/stacks/sip10/sip10-balance.hooks';
import { useCurrentAccountId } from '@app/store/accounts/account';
import {
  useCurrentStacksAccount,
  useFreshStacksAccount,
} from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import { type MoveNft, describeNft } from './move-to-fresh-account-nfts';
import { buildMovePlan } from './move-to-fresh-account.utils';

const bnsNamesRefreshDelayMs = 60_000;
const signingCancelledMessage = 'Signing was cancelled. Nothing was sent.';
const moveSucceededMessage = 'Moved your Stacks assets and switched to the fresh account';

async function refreshBnsNames() {
  await getHttpCacheService().clear('bns-v2-api-address-names');
  await queryClient.invalidateQueries({ queryKey: ['bns-service--get-account-bns-names'] });
}

function getErrorMessage(error: unknown) {
  if (isString(error)) return error;
  if (isError(error)) return error.message;
  return 'Unknown error';
}

async function broadcastInOrder(signedTxs: StacksTransactionWire[], network: StacksNetwork) {
  for (const [index, signedTx] of signedTxs.entries()) {
    let failure: string | undefined;
    let isBroadcast = false;
    await stacksBroadcastTransaction({
      network,
      signedTx,
      onSuccess() {
        isBroadcast = true;
      },
      onError(error) {
        failure = getErrorMessage(error);
      },
    });
    if (!isBroadcast) return { sentCount: index, error: failure ?? 'Unknown error' };
  }
  return { sentCount: signedTxs.length };
}

interface StayBehindItem {
  label: string;
  reason: string;
}

export function useMoveToFreshAccount() {
  const navigate = useNavigate();
  const toast = useToast();
  const accountId = useCurrentAccountId();
  const sender = useCurrentStacksAccount();
  const senderAddress = sender?.address ?? '';
  const freshAccount = useFreshStacksAccount();
  const freshAddress = freshAccount?.address ?? '';
  const policy = useCurrentPolicy();
  const network = useCurrentStacksNetworkState();
  const currentNetwork = useCurrentNetwork();
  const networkMode = stacksChainIdToCoreNetworkMode(currentNetwork.chain.stacks.chainId);
  const signStacksTransaction = useSignStacksTransaction();
  const { createNewAccount } = useKeyActions();
  const { handleSwitchAccount } = useSwitchAccount();
  const [isMoving, setIsMoving] = useState(false);

  const stxBalance = useStxAccountBalance(accountId);
  const sip10Balances = useSip10AddressTransferableTokenBalances(senderAddress);
  const senderNonce = useNextNonce(senderAddress);
  const freshNonce = useNextNonce(freshAddress);

  const nftsQuery = useQuery({
    queryKey: ['move-to-fresh-account-nfts', senderAddress, networkMode],
    async queryFn({ signal }) {
      const holdings = await getHiroStacksApiClient().getNftHoldings(
        senderAddress,
        { allPages: true },
        { signal }
      );
      return Promise.all(
        holdings.map(holding =>
          describeNft(
            {
              assetIdentifier: holding.asset_identifier,
              tokenIdHex: holding.value.hex,
              tokenIdRepr: holding.value.repr,
            },
            { network, networkMode, signal }
          )
        )
      );
    },
    enabled: !!senderAddress,
    refetchOnWindowFocus: false,
  });

  const isFreshAccountAvailable =
    !policy && !!freshAccount && freshAddress !== senderAddress && freshNonce.data?.nonce === 0;

  const nfts: MoveNft[] = nftsQuery.data ?? [];
  const movableNfts = nfts.filter(nft => !nft.stayBehindReason);
  const sip10s = sip10Balances.sip10s;
  const availableStx =
    stxBalance.state === 'success'
      ? stxBalance.value.stx.availableUnlockedBalance
      : createMoney(0, 'STX');
  const lockedStx: Money | undefined =
    stxBalance.state === 'success' && stxBalance.value.stx.lockedBalance.amount.isGreaterThan(0)
      ? stxBalance.value.stx.lockedBalance
      : undefined;
  const startNonce = senderNonce.data?.nonce;

  const isLoadingInputs =
    stxBalance.state === 'loading' ||
    sip10Balances.isLoading ||
    nftsQuery.isLoading ||
    senderNonce.isLoading ||
    freshNonce.isLoading;

  const senderPublicKey = sender?.stxPublicKey;
  const canBuildPlan =
    !isLoadingInputs &&
    isFreshAccountAvailable &&
    senderPublicKey !== undefined &&
    startNonce !== undefined;
  const planInputsKey = JSON.stringify([
    canBuildPlan,
    senderAddress,
    senderPublicKey,
    freshAddress,
    startNonce,
    network.chainId,
    availableStx.amount.toString(10),
    sip10s.map(sip10 => [sip10.asset.assetId, sip10.crypto.availableBalance.amount.toString(10)]),
    movableNfts.map(nft => [nft.assetIdentifier, nft.tokenIdHex]),
  ]);

  const planState = useAsync(async () => {
    if (!canBuildPlan) return undefined;
    return buildMovePlan({
      sender: { address: senderAddress, publicKey: senderPublicKey },
      recipient: freshAddress,
      network,
      startNonce,
      availableStx,
      sip10s,
      nfts: movableNfts,
      async estimateFee(tx) {
        const fees = await getStacksTransactionFeesService().getStacksTransactionFees(tx);
        return fees.options.standard.value;
      },
    });
  }, [planInputsKey]);

  const stayBehind: StayBehindItem[] = nfts
    .filter(nft => !!nft.stayBehindReason)
    .map(nft => ({ label: nft.name, reason: nft.stayBehindReason ?? '' }));

  async function signAll(transactions: StacksTransactionWire[]) {
    const signedTxs: StacksTransactionWire[] = [];
    for (const tx of transactions) {
      try {
        const signedTx = await signStacksTransaction(deserializeTransaction(tx.serialize()));
        if (!signedTx) {
          toast.info(signingCancelledMessage);
          return null;
        }
        signedTxs.push(signedTx);
      } catch (error) {
        if (isLedgerSigningCancelledError(error)) toast.info(signingCancelledMessage);
        else toast.error(getErrorMessage(error));
        return null;
      }
    }
    return signedTxs;
  }

  function switchToFreshAccount() {
    if (!sender || !freshAccount) return;
    if (sender.type === 'software') {
      void createNewAccount(sender.fingerprint);
      return;
    }
    handleSwitchAccount({
      fingerprint: freshAccount.fingerprint,
      accountIndex: freshAccount.accountIndex,
    });
  }

  async function move() {
    const plan = planState.result;
    if (plan?.status !== 'ready' || isMoving) return;
    setIsMoving(true);
    try {
      const signedTxs = await signAll(plan.transactions.map(transaction => transaction.tx));
      if (!signedTxs) return;

      const result = await broadcastInOrder(signedTxs, network);
      if (result.error !== undefined) {
        toast.error(
          `Sent ${result.sentCount} of ${signedTxs.length} transactions, then stopped: ${result.error}`
        );
        return;
      }

      if (movableNfts.length > 0) {
        void refreshBnsNames();
        setTimeout(() => void refreshBnsNames(), bnsNamesRefreshDelayMs);
      }

      switchToFreshAccount();
      toast.success(moveSucceededMessage, { duration: toastDurations.long });
      void navigate(RouteUrls.Home);
    } finally {
      setIsMoving(false);
    }
  }

  return {
    isLoading: isLoadingInputs || planState.loading,
    isFreshAccountAvailable,
    isLedger: sender?.type === 'ledger',
    freshAddress,
    plan: planState.result,
    planError: planState.error,
    sip10s,
    movableNfts,
    stayBehind,
    lockedStx,
    isMoving,
    move,
  };
}
