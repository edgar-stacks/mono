import { useCallback } from 'react';

import { PostConditionMode, serializeCV } from '@stacks/transactions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSbtcSponsorshipQuoteQueryConfig,
  createSbtcSponsorshipSubmitMutationConfig,
} from '@leather.io/queries';
import type { LeatherSponsorshipQuote } from '@leather.io/services';
import {
  TransactionTypes,
  buildSbtcSponsoredTransferPostCondition,
  buildSbtcTransferManyArgs,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
  sbtcTransferManyFunctionName,
} from '@leather.io/stacks';
import { createMoney, unitToFractionalUnit } from '@leather.io/utils';

import { useUserSettings } from '@app/hooks/use-user-settings';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';

import {
  calculateSbtcSponsorshipFee,
  isSbtcSponsorshipQuoteExpired,
} from './sbtc-sponsorship.utils';

export function useSbtcSponsorshipQuote(enabled: boolean) {
  const settings = useUserSettings();
  return useQuery({ ...createSbtcSponsorshipQuoteQueryConfig(settings), enabled });
}

export function useFetchSbtcSponsorshipQuote() {
  const settings = useUserSettings();
  const queryClient = useQueryClient();

  return useCallback(
    async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      const config = createSbtcSponsorshipQuoteQueryConfig(settings);
      if (!forceRefresh) {
        const quote = await queryClient.fetchQuery(config);
        if (!isSbtcSponsorshipQuoteExpired(quote.expiresAt)) return quote;
      }
      return queryClient.fetchQuery({ ...config, staleTime: 0 });
    },
    [queryClient, settings]
  );
}

export function useSubmitSbtcSponsoredTransfer() {
  return useMutation(createSbtcSponsorshipSubmitMutationConfig());
}

interface SbtcSponsoredTransferValues {
  amount: number | string;
  recipient: string;
  memo: string;
}

interface GenerateSbtcSponsoredTransferArgs {
  assetId: string;
  decimals: number;
  values: SbtcSponsoredTransferValues;
  nonce: number | string;
  quote: Pick<
    LeatherSponsorshipQuote,
    'feeRecipientPrincipal' | 'satsPerStx' | 'minFeeSats' | 'maxFeeSats'
  >;
  stxFeeMicro: string;
}

export function useGenerateSbtcSponsoredTransferUnsignedTx() {
  const account = useCurrentStacksAccount();
  const network = useCurrentStacksNetworkState();

  return useCallback(
    async ({
      assetId,
      decimals,
      values,
      nonce,
      quote,
      stxFeeMicro,
    }: GenerateSbtcSponsoredTransferArgs) => {
      if (!account) return;
      const { contractAddress, contractName, contractAssetName } =
        getStacksAssetStringParts(assetId);
      const amount = BigInt(unitToFractionalUnit(decimals)(values.amount).toString(10));
      const fee = BigInt(calculateSbtcSponsorshipFee(stxFeeMicro, quote).toString(10));

      return generateStacksUnsignedTransaction({
        txType: TransactionTypes.ContractCall,
        contractAddress,
        contractName,
        functionName: sbtcTransferManyFunctionName,
        functionArgs: buildSbtcTransferManyArgs({
          sender: account.address,
          recipient: values.recipient,
          amount,
          memo: values.memo || undefined,
          feeRecipient: quote.feeRecipientPrincipal,
          fee,
        }).map(arg => serializeCV(arg)),
        postConditions: [
          buildSbtcSponsoredTransferPostCondition({
            sender: account.address,
            contractId: `${contractAddress}.${contractName}`,
            assetName: contractAssetName,
            amount,
            fee,
          }),
        ],
        postConditionMode: PostConditionMode.Deny,
        network,
        publicKey: account.stxPublicKey,
        fee: createMoney(0, 'STX'),
        nonce,
        sponsored: true,
      });
    },
    [account, network]
  );
}
