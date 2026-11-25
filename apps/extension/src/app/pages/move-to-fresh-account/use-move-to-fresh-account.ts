import { useState } from 'react';
import { useNavigate } from 'react-router';

import type { StacksTransactionWire } from '@stacks/transactions';
import { useQuery } from '@tanstack/react-query';

import { bnsContractAddress } from '@leather.io/models';
import {
  getHiroStacksApiClient,
  getHttpCacheService,
  getStacksTransactionFeesService,
} from '@leather.io/services';
import { isError, isString } from '@leather.io/utils';

import { RouteUrls } from '@shared/route-urls';

import { useSwitchAccount } from '@app/common/hooks/account/use-switch-account';
import { useKeyActions } from '@app/common/hooks/use-key-actions';
import { queryClient } from '@app/common/persistence';
import { stacksBroadcastTransaction } from '@app/common/transactions/stacks/stacks-broadcast-transaction';
import { useWalletType } from '@app/common/use-wallet-type';
import { isLedgerSigningCancelledError } from '@app/features/ledger/flow/unwrap-ledger-signing-outcome';
import { toastDurations, useToast } from '@app/features/toasts/use-toast';
import { useUserSettings } from '@app/hooks/use-user-settings';
import { useStxAccountBalance } from '@app/query/stacks/balance/stx-balance.hooks';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useSip10AddressTransferableTokenBalances } from '@app/query/stacks/sip10/sip10-balance.hooks';
import { useCurrentAccountId } from '@app/store/accounts/account';
import {
  useCurrentStacksAccount,
  useFreshStacksAccount,
  useFreshStacksAccountAddress,
} from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import {
  useCurrentNetworkState,
  useCurrentStacksNetworkState,
} from '@app/store/networks/networks.hooks';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import { describeNft } from './move-to-fresh-account-nfts';
import {
  type MoveNft,
  type MovePlan,
  broadcastInOrder,
  buildMovePlan,
  createUnsignedMoveTransactions,
} from './move-to-fresh-account.utils';

const nftHoldingsMaxPages = 50;
const bnsNamesRefetchDelayMs = 60_000;
const bnsNamesQueryPrefix = 'bns-service--get-account-bns-names';

interface StaysBehindNft {
  name: string;
  reason: string;
}

function refreshBnsNames() {
  void getHttpCacheService().clear('bns-v2-api-address-names');
  void queryClient.invalidateQueries({ queryKey: [bnsNamesQueryPrefix] });
}

export function useMoveToFreshAccount() {
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useUserSettings();
  const { walletType, whenWallet } = useWalletType();
  const accountId = useCurrentAccountId();
  const sender = useCurrentStacksAccount();
  const freshAccount = useFreshStacksAccount();
  const policy = useCurrentPolicy();
  const stacksNetwork = useCurrentStacksNetworkState();
  const { isTestnet } = useCurrentNetworkState();
  const stxBalance = useStxAccountBalance(accountId);
  const senderAddress = sender?.address ?? '';
  const freshAddress = useFreshStacksAccountAddress();
  const { sip10s, isLoading: isSip10Loading } =
    useSip10AddressTransferableTokenBalances(senderAddress);
  const senderNonce = useNextNonce(senderAddress);
  const freshNonce = useNextNonce(freshAddress);
  const signStacksTransaction = useSignStacksTransaction();
  const { createNewAccount } = useKeyActions();
  const { handleSwitchAccount } = useSwitchAccount();
  const [isMoving, setIsMoving] = useState(false);

  const bnsAddress = isTestnet ? bnsContractAddress.testnet : bnsContractAddress.mainnet;
  const isFreshAccountAvailable = !!freshAccount && !policy && freshNonce.data?.nonce === 0;
  const isFreshAccountLoading = !!freshAccount && !policy && freshNonce.isLoading;

  const nftsQuery = useQuery({
    queryKey: ['move-to-fresh-account-nfts', senderAddress, bnsAddress, settings.network.id],
    enabled: !!senderAddress,
    gcTime: 0,
    async queryFn() {
      const client = getHiroStacksApiClient();
      const holdings = await client.getPrincipalNftBalances(senderAddress, {
        maxPages: nftHoldingsMaxPages,
      });
      return Promise.all(
        holdings.map(async holding => {
          const nftHolding = {
            assetIdentifier: holding.asset_identifier,
            hex: holding.value.hex,
            repr: holding.value.repr,
          };
          const description = await describeNft({
            holding: nftHolding,
            client,
            bnsContractAddress: bnsAddress,
          });
          return { ...nftHolding, ...description };
        })
      );
    },
  });

  const describedNfts = nftsQuery.data ?? [];
  const movingNfts: MoveNft[] = describedNfts
    .filter(nft => !nft.staysBehindReason)
    .map(({ assetIdentifier, hex, name }) => ({ assetIdentifier, hex, name }));
  const staysBehindNfts: StaysBehindNft[] = describedNfts.flatMap(({ name, staysBehindReason }) =>
    staysBehindReason ? [{ name, reason: staysBehindReason }] : []
  );

  const movingSip10s = sip10s.map(({ asset, crypto }) => ({
    assetId: asset.assetId,
    symbol: asset.symbol,
    amount: crypto.availableBalance,
  }));

  const stx = stxBalance.state === 'success' ? stxBalance.value.stx : undefined;
  const availableStx = stx?.availableUnlockedBalance;
  const lockedStx = stx?.lockedBalance;
  const nonce = senderNonce.data?.nonce;

  const transferContext =
    sender && freshAccount
      ? {
          publicKey: sender.stxPublicKey,
          senderAddress: sender.address,
          recipient: freshAccount.address,
          network: stacksNetwork,
        }
      : undefined;

  const planQuery = useQuery({
    queryKey: [
      'move-to-fresh-account-plan',
      transferContext,
      nonce,
      availableStx,
      movingSip10s,
      movingNfts,
      settings.network.id,
    ],
    enabled:
      isFreshAccountAvailable &&
      !!transferContext &&
      !!availableStx &&
      nonce !== undefined &&
      !isSip10Loading &&
      nftsQuery.isSuccess,
    gcTime: 0,
    async queryFn() {
      if (!transferContext || !availableStx || nonce === undefined)
        throw new Error('Move plan inputs are not loaded');
      return buildMovePlan({
        context: transferContext,
        nonce,
        availableStx,
        sip10s: movingSip10s,
        nfts: movingNfts,
        async estimateFee(unsignedTx) {
          const fees = await getStacksTransactionFeesService().getStacksTransactionFees(unsignedTx);
          return fees.options.standard.value;
        },
      });
    },
  });

  const hasError = planQuery.isError || nftsQuery.isError;

  function broadcast(signedTx: StacksTransactionWire) {
    return new Promise<void>((resolve, reject) => {
      void stacksBroadcastTransaction({
        network: stacksNetwork,
        signedTx,
        onSuccess: () => resolve(),
        onError: error => reject(isString(error) ? new Error(error) : error),
      });
    });
  }

  async function signAll(unsignedTxs: StacksTransactionWire[]) {
    const signedTxs: StacksTransactionWire[] = [];
    for (const unsignedTx of unsignedTxs) {
      const signedTx = await signStacksTransaction(unsignedTx);
      if (!signedTx) return null;
      signedTxs.push(signedTx);
    }
    return signedTxs;
  }

  function switchToFreshAccount() {
    if (!sender || !freshAccount) return;
    whenWallet({
      software: () => void createNewAccount(sender.fingerprint),
      ledger: () =>
        handleSwitchAccount({
          fingerprint: freshAccount.fingerprint,
          accountIndex: freshAccount.accountIndex,
        }),
    })();
  }

  async function move(plan: MovePlan) {
    if (!transferContext || isMoving) return;
    setIsMoving(true);
    try {
      const unsignedTxs = await createUnsignedMoveTransactions(transferContext, plan);

      const signedTxs = await signAll(unsignedTxs).catch((error: unknown) => {
        if (isLedgerSigningCancelledError(error)) return null;
        throw error;
      });
      if (!signedTxs) {
        toast.error('Signing was cancelled. Nothing was sent.');
        return;
      }

      const { sent, error } = await broadcastInOrder(signedTxs, broadcast);
      if (error !== undefined) {
        toast.error(`Sent ${sent} of ${signedTxs.length} transactions, then stopped: ${error}`);
        return;
      }

      if (plan.transfers.some(transfer => transfer.kind === 'nft')) {
        refreshBnsNames();
        setTimeout(refreshBnsNames, bnsNamesRefetchDelayMs);
      }

      switchToFreshAccount();
      toast.success('Moved your Stacks assets and switched to the fresh account', {
        duration: toastDurations.long,
      });
      void navigate(RouteUrls.Home);
    } catch (error) {
      toast.error(isError(error) ? error.message : 'Unable to move your Stacks assets');
    } finally {
      setIsMoving(false);
    }
  }

  return {
    walletType,
    freshAccount,
    isFreshAccountAvailable,
    isLoading: isFreshAccountLoading || (isFreshAccountAvailable && !planQuery.data && !hasError),
    planResult: planQuery.data,
    hasError,
    lockedStx,
    staysBehindNfts,
    isMoving,
    move,
  };
}
