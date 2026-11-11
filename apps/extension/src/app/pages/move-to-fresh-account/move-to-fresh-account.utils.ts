import type { StacksNetwork } from '@stacks/network';
import {
  Pc,
  PostConditionMode,
  type StacksTransactionWire,
  serializeCV,
} from '@stacks/transactions';

import type { Money } from '@leather.io/models';
import type { Sip10Balance } from '@leather.io/services';
import {
  TransactionTypes,
  createSip9FnArgs,
  createSip10FnArgs,
  formatContractIdString,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
} from '@leather.io/stacks';
import { createMoney, subtractMoney, sumMoney } from '@leather.io/utils';

import type { MovableNft } from './move-to-fresh-account-nfts';

const zeroStx = createMoney(0, 'STX');

interface TransferBase {
  senderAddress: string;
  publicKey: string;
  recipient: string;
  network: StacksNetwork;
  nonce: number;
  fee: Money;
}

interface BuildSip10TransferArgs extends TransferBase {
  assetId: string;
  amount: Money;
}

function buildSip10Transfer({
  assetId,
  amount,
  senderAddress,
  publicKey,
  recipient,
  network,
  nonce,
  fee,
}: BuildSip10TransferArgs) {
  const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(assetId);
  const baseUnitAmount = amount.amount.toFixed(0);

  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.ContractCall,
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: createSip10FnArgs({
      amount: baseUnitAmount,
      senderStacksAddress: senderAddress,
      recipientStacksAddress: recipient,
    }).map(arg => serializeCV(arg)),
    postConditions: [
      Pc.principal(senderAddress)
        .willSendEq(baseUnitAmount)
        .ft(formatContractIdString({ contractAddress, contractName }), contractAssetName),
    ],
    postConditionMode: PostConditionMode.Deny,
    publicKey,
    network,
    nonce,
    fee,
  });
}

interface BuildNftTransferArgs extends TransferBase {
  nft: MovableNft;
}

function buildNftTransfer({
  nft,
  senderAddress,
  publicKey,
  recipient,
  network,
  nonce,
  fee,
}: BuildNftTransferArgs) {
  const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(
    nft.assetIdentifier
  );
  const functionArgs = createSip9FnArgs({
    assetId: nft.valueHex,
    senderStacksAddress: senderAddress,
    recipientStacksAddress: recipient,
  });

  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.ContractCall,
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: functionArgs.map(arg => serializeCV(arg)),
    postConditions: [
      Pc.principal(senderAddress)
        .willSendAsset()
        .nft(
          formatContractIdString({ contractAddress, contractName }),
          contractAssetName,
          functionArgs[0]
        ),
    ],
    postConditionMode: PostConditionMode.Deny,
    publicKey,
    network,
    nonce,
    fee,
  });
}

interface BuildStxTransferArgs extends TransferBase {
  amount: Money;
}

function buildStxTransfer({
  amount,
  publicKey,
  recipient,
  network,
  nonce,
  fee,
}: BuildStxTransferArgs) {
  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.StxTokenTransfer,
    recipient,
    amount,
    publicKey,
    network,
    nonce,
    fee,
  });
}

export function calculateStxToMove(availableBalance: Money, fees: Money[]) {
  if (fees.length === 0) return availableBalance;
  return subtractMoney(availableBalance, sumMoney(fees));
}

export interface MoveTransaction {
  label: string;
  tx: StacksTransactionWire;
  fee: Money;
}

type MovePlan =
  | { status: 'ready'; transactions: MoveTransaction[]; stxToMove: Money; totalFee: Money }
  | { status: 'insufficient-fees'; totalFee: Money };

interface BuildMovePlanArgs {
  senderAddress: string;
  publicKey: string;
  recipient: string;
  network: StacksNetwork;
  firstNonce: number;
  availableStx: Money;
  sip10s: Sip10Balance[];
  nfts: MovableNft[];
  estimateFee(tx: StacksTransactionWire): Promise<Money>;
}

async function withEstimatedFee(
  build: (fee: Money) => Promise<StacksTransactionWire>,
  estimateFee: (tx: StacksTransactionWire) => Promise<Money>
) {
  const fee = await estimateFee(await build(zeroStx));
  return { tx: await build(fee), fee };
}

export async function buildMovePlan({
  senderAddress,
  publicKey,
  recipient,
  network,
  firstNonce,
  availableStx,
  sip10s,
  nfts,
  estimateFee,
}: BuildMovePlanArgs): Promise<MovePlan> {
  const base = { senderAddress, publicKey, recipient, network };

  const sip10Transactions = await Promise.all(
    sip10s.map(async (sip10, index) => {
      const { tx, fee } = await withEstimatedFee(
        fee =>
          buildSip10Transfer({
            ...base,
            assetId: sip10.asset.assetId,
            amount: sip10.crypto.availableBalance,
            nonce: firstNonce + index,
            fee,
          }),
        estimateFee
      );
      return { label: sip10.asset.symbol, tx, fee };
    })
  );

  const nftTransactions = await Promise.all(
    nfts.map(async (nft, index) => {
      const { tx, fee } = await withEstimatedFee(
        fee =>
          buildNftTransfer({
            ...base,
            nft,
            nonce: firstNonce + sip10s.length + index,
            fee,
          }),
        estimateFee
      );
      return { label: nft.name, tx, fee };
    })
  );

  const stxNonce = firstNonce + sip10s.length + nfts.length;
  const stxFee = await estimateFee(
    await buildStxTransfer({ ...base, amount: availableStx, nonce: stxNonce, fee: zeroStx })
  );

  const assetTransactions = [...sip10Transactions, ...nftTransactions];
  const fees = [...assetTransactions.map(transaction => transaction.fee), stxFee];
  const totalFee = sumMoney(fees);
  const stxToMove = calculateStxToMove(availableStx, fees);

  if (!stxToMove.amount.isGreaterThan(0)) return { status: 'insufficient-fees', totalFee };

  const stxTx = await buildStxTransfer({
    ...base,
    amount: stxToMove,
    nonce: stxNonce,
    fee: stxFee,
  });

  return {
    status: 'ready',
    transactions: [...assetTransactions, { label: 'STX', tx: stxTx, fee: stxFee }],
    stxToMove,
    totalFee,
  };
}
