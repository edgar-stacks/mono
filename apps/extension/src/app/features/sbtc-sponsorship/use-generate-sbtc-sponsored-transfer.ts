import { useCallback } from 'react';

import { PostConditionMode, serializeCV } from '@stacks/transactions';
import BigNumber from 'bignumber.js';

import {
  SBTC_TRANSFER_MANY_FUNCTION_NAME,
  TransactionTypes,
  buildSbtcSponsoredTransferPostCondition,
  buildSbtcTransferManyArgs,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
} from '@leather.io/stacks';
import { createMoney, unitToFractionalUnit } from '@leather.io/utils';

import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';

interface SbtcSponsoredTransferFormValues {
  amount: number | string;
  recipient: string;
  memo?: string;
}

interface GenerateSbtcSponsoredTransferArgs {
  assetId: string;
  decimals: number;
  values: SbtcSponsoredTransferFormValues;
  feeRecipient: string;
  sbtcFee: BigNumber;
  stxFeeMicro: BigNumber.Value;
  nonce: number | string;
}

export function useGenerateSbtcSponsoredTransferUnsignedTx() {
  const account = useCurrentStacksAccount();
  const network = useCurrentStacksNetworkState();

  return useCallback(
    async ({
      assetId,
      decimals,
      values,
      feeRecipient,
      sbtcFee,
      stxFeeMicro,
      nonce,
    }: GenerateSbtcSponsoredTransferArgs) => {
      if (!account) return;
      const { contractAddress, contractName, contractAssetName } =
        getStacksAssetStringParts(assetId);
      const amount = unitToFractionalUnit(decimals)(values.amount).toString(10);
      const fee = sbtcFee.toString(10);

      return generateStacksUnsignedTransaction({
        txType: TransactionTypes.ContractCall,
        contractAddress,
        contractName,
        functionName: SBTC_TRANSFER_MANY_FUNCTION_NAME,
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
            amount,
            fee,
            contractId: `${contractAddress}.${contractName}`,
            assetName: contractAssetName,
          }),
        ],
        postConditionMode: PostConditionMode.Deny,
        network,
        publicKey: account.stxPublicKey,
        fee: createMoney(new BigNumber(stxFeeMicro), 'STX'),
        nonce,
        sponsored: true,
      });
    },
    [account, network]
  );
}
