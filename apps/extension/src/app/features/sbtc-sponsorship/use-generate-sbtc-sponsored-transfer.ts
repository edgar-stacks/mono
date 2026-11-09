import { useCallback } from 'react';

import { PostConditionMode, serializeCV } from '@stacks/transactions';
import type BigNumber from 'bignumber.js';

import {
  TransactionTypes,
  buildSbtcSponsoredTransferPostCondition,
  buildSbtcTransferManyArgs,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
  sbtcTransferManyFunctionName,
} from '@leather.io/stacks';
import { createMoney, unitToFractionalUnit } from '@leather.io/utils';

import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';

import { sbtcDecimals } from './sbtc-sponsorship.utils';

interface SbtcSponsoredTransferValues {
  amount: string;
  recipient: string;
  memo?: string;
}

interface GenerateSbtcSponsoredTransferArgs {
  assetId: string;
  values: SbtcSponsoredTransferValues;
  feeRecipient: string;
  feeSats: BigNumber;
  nonce: number | string;
}

export function useGenerateSbtcSponsoredTransferUnsignedTx() {
  const account = useCurrentStacksAccount();
  const network = useCurrentStacksNetworkState();

  return useCallback(
    async ({
      assetId,
      values,
      feeRecipient,
      feeSats,
      nonce,
    }: GenerateSbtcSponsoredTransferArgs) => {
      if (!account) return;
      const { contractAddress, contractAssetName, contractName } =
        getStacksAssetStringParts(assetId);
      const amount = BigInt(unitToFractionalUnit(sbtcDecimals)(values.amount).toString(10));
      const fee = BigInt(feeSats.toString(10));

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
          feeRecipient,
          fee,
        }).map(arg => serializeCV(arg)),
        postConditions: [
          buildSbtcSponsoredTransferPostCondition({
            sender: account.address,
            contractAddress,
            contractName,
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
