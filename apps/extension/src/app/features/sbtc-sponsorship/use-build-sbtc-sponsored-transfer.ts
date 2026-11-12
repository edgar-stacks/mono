import { useCallback } from 'react';

import { PostConditionMode, serializeCV } from '@stacks/transactions';

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

const sbtcTransferManyFunctionName = 'transfer-many';

interface SbtcSponsoredTransferFormValues {
  amount: number | string;
  recipient: string;
  memo?: string;
  feeType?: string;
}

interface BuildSbtcSponsoredTransferArgs {
  assetId: string;
  decimals: number;
  formValues: SbtcSponsoredTransferFormValues;
  quote: SbtcSponsorshipQuote;
  stxFeeMicro: string;
  nonce: number | string;
}

export function useBuildSbtcSponsoredTransfer() {
  const account = useCurrentStacksAccount();
  const network = useCurrentStacksNetworkState();

  return useCallback(
    async ({
      assetId,
      decimals,
      formValues,
      quote,
      stxFeeMicro,
      nonce,
    }: BuildSbtcSponsoredTransferArgs) => {
      if (!account) throw new Error('No Stacks account to send from');
      const { contractAddress, contractName, contractAssetName } =
        getStacksAssetStringParts(assetId);
      const amount = BigInt(unitToFractionalUnit(decimals)(formValues.amount).toString(10));
      const fee = BigInt(convertStxFeeToSbtcFee({ ...quote, stxFeeMicro }).toString(10));

      const functionArgs = buildSbtcTransferManyArgs({
        sender: account.address,
        recipient: formValues.recipient,
        amount,
        memo: formValues.memo || undefined,
        feeRecipient: quote.feeRecipientPrincipal,
        fee,
      });

      return generateStacksUnsignedTransaction({
        txType: TransactionTypes.ContractCall,
        contractAddress,
        contractName,
        functionName: sbtcTransferManyFunctionName,
        functionArgs: functionArgs.map(arg => serializeCV(arg)),
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
