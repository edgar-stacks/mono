import { useCallback } from 'react';

import { PostConditionMode, serializeCV } from '@stacks/transactions';
import type BigNumber from 'bignumber.js';

import type { SbtcSponsorshipQuote } from '@leather.io/services';
import {
  TransactionTypes,
  buildSbtcSponsoredTransferPostCondition,
  buildSbtcTransferManyArgs,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
} from '@leather.io/stacks';
import { createMoney, unitToFractionalUnit } from '@leather.io/utils';

import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';

import { convertStxFeeToSbtcFee } from './sbtc-sponsorship.utils';

interface SbtcSponsoredTransferValues {
  amount: number | string;
  recipient: string;
  memo: string;
}

interface BuildSbtcSponsoredTransferArgs {
  assetId: string;
  decimals: number;
  values: SbtcSponsoredTransferValues;
  nonce: number | string;
  quote: SbtcSponsorshipQuote;
  stxFeeMicro: BigNumber.Value;
}

export function useBuildSbtcSponsoredTransfer() {
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
    }: BuildSbtcSponsoredTransferArgs) => {
      if (!account) throw new Error('No Stacks account to send sBTC from');
      const { contractAddress, contractName, contractAssetName } =
        getStacksAssetStringParts(assetId);
      const amount = unitToFractionalUnit(decimals)(values.amount).toString(10);
      const fee = convertStxFeeToSbtcFee(stxFeeMicro, quote);
      const feeAmount = fee.amount.toFixed();

      const tx = await generateStacksUnsignedTransaction({
        txType: TransactionTypes.ContractCall,
        contractAddress,
        contractName,
        functionName: 'transfer-many',
        functionArgs: buildSbtcTransferManyArgs({
          sender: account.address,
          recipient: values.recipient,
          amount,
          feeRecipient: quote.feeRecipientPrincipal,
          fee: feeAmount,
          memo: values.memo || undefined,
        }).map(arg => serializeCV(arg)),
        postConditions: [
          buildSbtcSponsoredTransferPostCondition({
            sender: account.address,
            contractAddress,
            contractName,
            assetName: contractAssetName,
            amount,
            fee: feeAmount,
          }),
        ],
        postConditionMode: PostConditionMode.Deny,
        network,
        publicKey: account.stxPublicKey,
        fee: createMoney(0, 'STX'),
        nonce,
        sponsored: true,
      });

      return { tx, fee };
    },
    [account, network]
  );
}
