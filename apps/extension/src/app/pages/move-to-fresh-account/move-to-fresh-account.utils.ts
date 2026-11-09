import type { StacksNetwork } from '@stacks/network';
import { PostConditionMode, type StacksTransactionWire, serializeCV } from '@stacks/transactions';

import type { Money } from '@leather.io/models';
import type { Sip10Balance } from '@leather.io/services';
import {
  TransactionTypes,
  createSip9FnArgs,
  createSip10FnArgs,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
} from '@leather.io/stacks';
import { createMoney, subtractMoney, sumMoney } from '@leather.io/utils';

import { makeFtPostCondition, makeNftPostCondition } from '@shared/utils/post-conditions';

import type { MoveNft } from './move-to-fresh-account-nfts';

const zeroStx = createMoney(0, 'STX');

const notEnoughStxForFeesMessage = 'Not enough STX to pay the fees';

export function calculateStxToMove(availableBalance: Money, fees: Money[]) {
  if (fees.length === 0) return availableBalance;
  return subtractMoney(availableBalance, sumMoney(fees));
}

interface MoveSender {
  address: string;
  publicKey: string;
}

interface TransferTxArgs {
  sender: MoveSender;
  recipient: string;
  nonce: number;
  fee: Money;
  network: StacksNetwork;
}

function generateSip10TransferTx({
  sip10,
  sender,
  recipient,
  nonce,
  fee,
  network,
}: TransferTxArgs & { sip10: Sip10Balance }) {
  const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(
    sip10.asset.assetId
  );
  const amount = sip10.crypto.availableBalance.amount.toString(10);

  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.ContractCall,
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: createSip10FnArgs({
      amount,
      senderStacksAddress: sender.address,
      recipientStacksAddress: recipient,
    }).map(arg => serializeCV(arg)),
    postConditions: [
      makeFtPostCondition({
        amount,
        contractAddress,
        contractAssetName,
        contractName,
        stxAddress: sender.address,
      }),
    ],
    postConditionMode: PostConditionMode.Deny,
    publicKey: sender.publicKey,
    fee,
    nonce,
    network,
  });
}

function generateNftTransferTx({
  nft,
  sender,
  recipient,
  nonce,
  fee,
  network,
}: TransferTxArgs & { nft: MoveNft }) {
  const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(
    nft.assetIdentifier
  );

  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.ContractCall,
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: createSip9FnArgs({
      assetId: nft.tokenIdHex,
      senderStacksAddress: sender.address,
      recipientStacksAddress: recipient,
    }).map(arg => serializeCV(arg)),
    postConditions: [
      makeNftPostCondition({
        assetId: nft.tokenIdHex,
        contractAddress,
        contractAssetName,
        contractName,
        stxAddress: sender.address,
      }),
    ],
    postConditionMode: PostConditionMode.Deny,
    publicKey: sender.publicKey,
    fee,
    nonce,
    network,
  });
}

function generateStxTransferTx({
  amount,
  sender,
  recipient,
  nonce,
  fee,
  network,
}: TransferTxArgs & { amount: Money }) {
  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.StxTokenTransfer,
    publicKey: sender.publicKey,
    recipient,
    amount,
    fee,
    nonce,
    network,
  });
}

interface MovePlanTransaction {
  label: string;
  tx: StacksTransactionWire;
  fee: Money;
}

type MovePlan =
  | {
      status: 'ready';
      transactions: MovePlanTransaction[];
      stxToMove: Money;
      totalFee: Money;
    }
  | { status: 'error'; message: string };

interface BuildMovePlanArgs {
  sender: MoveSender;
  recipient: string;
  network: StacksNetwork;
  startNonce: number;
  availableStx: Money;
  sip10s: Sip10Balance[];
  nfts: MoveNft[];
  estimateFee(tx: StacksTransactionWire): Promise<Money>;
}

export async function buildMovePlan({
  sender,
  recipient,
  network,
  startNonce,
  availableStx,
  sip10s,
  nfts,
  estimateFee,
}: BuildMovePlanArgs): Promise<MovePlan> {
  const baseArgs = { sender, recipient, network, fee: zeroStx };

  const assetTransfers = [
    ...sip10s.map(sip10 => ({
      label: sip10.asset.symbol,
      generate(nonce: number) {
        return generateSip10TransferTx({ ...baseArgs, nonce, sip10 });
      },
    })),
    ...nfts.map(nft => ({
      label: nft.name,
      generate(nonce: number) {
        return generateNftTransferTx({ ...baseArgs, nonce, nft });
      },
    })),
  ];

  const transactions: MovePlanTransaction[] = [];
  for (const [index, transfer] of assetTransfers.entries()) {
    const tx = await transfer.generate(startNonce + index);
    const fee = await estimateFee(tx);
    tx.setFee(fee.amount.toString(10));
    transactions.push({ label: transfer.label, tx, fee });
  }

  const stxNonce = startNonce + assetTransfers.length;
  const stxEstimationTx = await generateStxTransferTx({
    ...baseArgs,
    nonce: stxNonce,
    amount: availableStx,
  });
  const stxFee = await estimateFee(stxEstimationTx);
  const fees = [...transactions.map(transaction => transaction.fee), stxFee];
  const stxToMove = calculateStxToMove(availableStx, fees);

  if (!stxToMove.amount.isGreaterThan(0))
    return { status: 'error', message: notEnoughStxForFeesMessage };

  const stxTx = await generateStxTransferTx({
    ...baseArgs,
    nonce: stxNonce,
    amount: stxToMove,
    fee: stxFee,
  });
  transactions.push({ label: 'STX', tx: stxTx, fee: stxFee });

  return { status: 'ready', transactions, stxToMove, totalFee: sumMoney(fees) };
}
