import { useMemo, useState } from 'react';
import { useAsync } from 'react-async-hook';
import { useNavigate } from 'react-router';

import type { StacksNetwork } from '@stacks/network';
import type { StacksTransactionWire } from '@stacks/transactions';

import type { Money } from '@leather.io/models';
import {
  getHiroStacksApiClient,
  getHttpCacheService,
  getStacksTransactionFeesService,
} from '@leather.io/services';
import { createMoney, isString } from '@leather.io/utils';

import { RouteUrls } from '@shared/route-urls';

import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { queryClient } from '@app/common/persistence';
import { stacksBroadcastTransaction } from '@app/common/transactions/stacks/stacks-broadcast-transaction';
import { isLedgerSigningCancelledError } from '@app/features/ledger/flow/unwrap-ledger-signing-outcome';
import { useToast } from '@app/features/toasts/use-toast';
import { useStxAccountBalance } from '@app/query/stacks/balance/stx-balance.hooks';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useSip10AddressTransferableTokenBalances } from '@app/query/stacks/sip10/sip10-balance.hooks';
import { useCurrentAccountId } from '@app/store/accounts/account';
import {
  useCurrentStacksAccount,
  useFreshStacksAccount,
} from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useActiveWalletType } from '@app/store/common/wallet-type.selectors';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import { type MovableNft, type StaysBehindNft, describeNft } from './move-to-fresh-account-nfts';
import { type MovableToken, type MovePlan, buildMovePlan } from './move-to-fresh-account.utils';

const bnsNamesRefreshDelay = 60_000;
const signingCancelledMessage = 'Signing was cancelled. Nothing was sent.';
const movedMessage = 'Moved your Stacks assets and switched to the fresh account';
const zeroStx = createMoney(0, 'STX');

type MoveStatus = 'idle' | 'signing' | 'broadcasting';

async function refreshBnsNames() {
  await getHttpCacheService().clear('bns-v2-api-address-names');
  await queryClient.invalidateQueries({ queryKey: ['bns-service--get-account-bns-names'] });
}

async function estimateStandardFee(unsignedTx: StacksTransactionWire) {
  const fees = await getStacksTransactionFeesService().getStacksTransactionFees(unsignedTx);
  return fees.options.standard.value;
}

function getErrorMessage(error: unknown) {
  if (isString(error)) return error;
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

function broadcastInOrder(network: StacksNetwork, signedTx: StacksTransactionWire) {
  return new Promise<string | null>(resolve => {
    void stacksBroadcastTransaction({
      network,
      signedTx,
      onSuccess() {
        resolve(null);
      },
      onError(error) {
        resolve(getErrorMessage(error));
      },
    });
  });
}

async function loadNfts(senderAddress: string, network: StacksNetwork) {
  const holdings = await getHiroStacksApiClient().getNftHoldings(senderAddress, {
    allPages: true,
  });
  const descriptions = await Promise.all(
    holdings.map(holding => describeNft(holding, { network, senderAddress }))
  );
  const moving: MovableNft[] = [];
  const staying: StaysBehindNft[] = [];
  descriptions.forEach(description => {
    if (description.status === 'moves') moving.push(description.nft);
    else staying.push(description.nft);
  });
  return { moving, staying };
}

export type MoveToFreshAccountState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      freshAddress: string;
      plan: Extract<MovePlan, { status: 'ready' }>;
      tokens: MovableToken[];
      nfts: MovableNft[];
      staysBehind: StaysBehindNft[];
      lockedStx: Money;
      isLedger: boolean;
      moveStatus: MoveStatus;
      onMove(): Promise<void>;
    };

export function useMoveToFreshAccount(): MoveToFreshAccountState {
  const navigate = useNavigate();
  const toast = useToast();
  const { createNewAccount, switchAccount } = useKeyActions();
  const signStacksTransaction = useSignStacksTransaction();
  const accountId = useCurrentAccountId();
  const account = useCurrentStacksAccount();
  const freshAccount = useFreshStacksAccount();
  const policy = useCurrentPolicy();
  const walletType = useActiveWalletType();
  const network = useCurrentStacksNetworkState();
  const [moveStatus, setMoveStatus] = useState<MoveStatus>('idle');

  const senderAddress = account?.address ?? '';
  const freshAddress = freshAccount?.address ?? '';
  const isLedger = walletType === 'ledger';

  const stxBalance = useStxAccountBalance(accountId);
  const { sip10s, isLoading: isLoadingTokens } =
    useSip10AddressTransferableTokenBalances(senderAddress);
  const { data: senderNonce } = useNextNonce(senderAddress);
  const { data: freshNonce } = useNextNonce(freshAddress);

  const nfts = useAsync(
    async () => (senderAddress ? loadNfts(senderAddress, network) : undefined),
    [senderAddress, network]
  );

  const tokens: MovableToken[] = useMemo(
    () =>
      sip10s.map(balance => ({
        assetId: balance.asset.assetId,
        symbol: balance.asset.symbol,
        amount: balance.crypto.availableBalance,
      })),
    [sip10s]
  );

  const availableStx = stxBalance.value?.stx.availableUnlockedBalance;
  const isFreshAccountAvailable = !!freshAccount && !policy && freshNonce?.nonce === 0;
  const canBuildPlan =
    isFreshAccountAvailable &&
    !!account &&
    !!availableStx &&
    !isLoadingTokens &&
    !!nfts.result &&
    senderNonce?.nonce !== undefined;

  const planKey = canBuildPlan
    ? JSON.stringify([
        senderAddress,
        freshAddress,
        senderNonce?.nonce,
        availableStx?.amount.toString(),
        tokens.map(token => [token.assetId, token.amount.amount.toString()]),
        nfts.result?.moving.map(nft => [nft.assetIdentifier, nft.tokenHex]),
      ])
    : '';

  const plan = useAsync(async () => {
    if (!canBuildPlan || !account || !availableStx || senderNonce?.nonce === undefined) return;
    return buildMovePlan({
      sender: { address: account.address, publicKey: account.stxPublicKey },
      recipient: freshAddress,
      network,
      startNonce: senderNonce.nonce,
      availableStx,
      tokens,
      nfts: nfts.result?.moving ?? [],
      estimateFee: estimateStandardFee,
    });
  }, [planKey]);

  async function signAll(transactions: StacksTransactionWire[]) {
    const signed: StacksTransactionWire[] = [];
    for (const unsignedTx of transactions) {
      const signedTx = await signStacksTransaction(unsignedTx);
      if (!signedTx) return null;
      signed.push(signedTx);
    }
    return signed;
  }

  async function switchToFreshAccount() {
    if (isLedger) {
      if (freshAccount) {
        switchAccount({
          fingerprint: freshAccount.fingerprint,
          accountIndex: freshAccount.accountIndex,
        });
      }
      return;
    }
    await createNewAccount(accountId.fingerprint);
  }

  async function moveAssets(readyPlan: Extract<MovePlan, { status: 'ready' }>, hasNfts: boolean) {
    const { transactions } = readyPlan;
    setMoveStatus('signing');

    try {
      const signed = await signAll(transactions.map(tx => tx.unsignedTx));
      if (!signed) {
        toast.error(signingCancelledMessage);
        setMoveStatus('idle');
        return;
      }

      setMoveStatus('broadcasting');
      for (const [index, signedTx] of signed.entries()) {
        const error = await broadcastInOrder(network, signedTx);
        if (error !== null) {
          toast.error(`Sent ${index} of ${signed.length} transactions, then stopped: ${error}`);
          setMoveStatus('idle');
          return;
        }
      }
    } catch (error) {
      toast.error(
        isLedgerSigningCancelledError(error) ? signingCancelledMessage : getErrorMessage(error)
      );
      setMoveStatus('idle');
      return;
    }

    if (hasNfts) {
      void refreshBnsNames();
      setTimeout(() => void refreshBnsNames(), bnsNamesRefreshDelay);
    }

    await switchToFreshAccount();
    toast.success(movedMessage);
    void navigate(RouteUrls.Home);
  }

  if (policy) return { status: 'unavailable' };
  if (!freshAccount) return { status: 'unavailable' };
  if (!freshNonce) return { status: 'loading' };
  if (!isFreshAccountAvailable) return { status: 'unavailable' };

  if (stxBalance.state === 'error')
    return { status: 'error', message: 'Could not load your balance' };
  if (nfts.error) return { status: 'error', message: 'Could not load your collectibles' };
  if (plan.error) return { status: 'error', message: 'Could not estimate the fees' };
  if (!plan.result) return { status: 'loading' };
  if (plan.result.status === 'error') return { status: 'error', message: plan.result.message };

  const readyPlan = plan.result;
  const movingNfts = nfts.result?.moving ?? [];

  return {
    status: 'ready',
    freshAddress,
    plan: readyPlan,
    tokens,
    nfts: movingNfts,
    staysBehind: nfts.result?.staying ?? [],
    lockedStx: stxBalance.value?.stx.lockedBalance ?? zeroStx,
    isLedger,
    moveStatus,
    onMove() {
      return moveAssets(readyPlan, movingNfts.length > 0);
    },
  };
}
