import type { StacksNetwork } from '@stacks/network';
import { PostConditionMode, type StacksTransactionWire, serializeCV } from '@stacks/transactions';

import type { Money } from '@leather.io/models';
import {
  TransactionTypes,
  createSip9FnArgs,
  createSip10FnArgs,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
} from '@leather.io/stacks';
import { createMoney } from '@leather.io/utils';

import { makeFtPostCondition, makeNftPostCondition } from '@shared/utils/post-conditions';

import type { MovableNft } from './move-to-fresh-account-nfts';

const zeroFee = createMoney(0, 'STX');
const notEnoughStxMessage = 'Not enough STX to pay the fees';

interface MoveSender {
  address: string;
  publicKey: string;
}

export interface MovableToken {
  assetId: string;
  symbol: string;
  amount: Money;
}

interface TransferContext {
  sender: MoveSender;
  recipient: string;
  network: StacksNetwork;
  nonce: number;
  fee: Money;
}

function createSip10TransferTx(token: MovableToken, context: TransferContext) {
  const { sender, recipient, network, nonce, fee } = context;
  const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(
    token.assetId
  );
  const amount = token.amount.amount.toFixed(0);
  const functionArgs = createSip10FnArgs({
    amount,
    senderStacksAddress: sender.address,
    recipientStacksAddress: recipient,
  });

  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.ContractCall,
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: functionArgs.map(arg => serializeCV(arg)),
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
    network,
    nonce,
    fee,
  });
}

function createSip9TransferTx(nft: MovableNft, context: TransferContext) {
  const { sender, recipient, network, nonce, fee } = context;
  const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(
    nft.assetIdentifier
  );
  const functionArgs = createSip9FnArgs({
    assetId: nft.tokenHex,
    senderStacksAddress: sender.address,
    recipientStacksAddress: recipient,
  });

  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.ContractCall,
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: functionArgs.map(arg => serializeCV(arg)),
    postConditions: [
      makeNftPostCondition({
        assetId: nft.tokenHex,
        contractAddress,
        contractAssetName,
        contractName,
        stxAddress: sender.address,
      }),
    ],
    postConditionMode: PostConditionMode.Deny,
    publicKey: sender.publicKey,
    network,
    nonce,
    fee,
  });
}

function createStxTransferTx(amount: Money, context: TransferContext) {
  const { sender, recipient, network, nonce, fee } = context;
  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.StxTokenTransfer,
    recipient,
    amount,
    publicKey: sender.publicKey,
    network,
    nonce,
    fee,
  });
}

function sumFees(fees: Money[]) {
  return createMoney(
    fees.reduce((total, fee) => total.plus(fee.amount), zeroFee.amount),
    'STX'
  );
}

export function calculateStxToMove(availableBalance: Money, fees: Money[]) {
  return createMoney(availableBalance.amount.minus(sumFees(fees).amount), 'STX');
}

interface MoveTransaction {
  label: string;
  unsignedTx: StacksTransactionWire;
  fee: Money;
}

export type MovePlan =
  | {
      status: 'ready';
      transactions: MoveTransaction[];
      stxAmount: Money;
      totalFee: Money;
    }
  | { status: 'error'; message: string };

interface BuildMovePlanArgs {
  sender: MoveSender;
  recipient: string;
  network: StacksNetwork;
  startNonce: number;
  availableStx: Money;
  tokens: MovableToken[];
  nfts: MovableNft[];
  estimateFee(unsignedTx: StacksTransactionWire): Promise<Money>;
}

export async function buildMovePlan({
  sender,
  recipient,
  network,
  startNonce,
  availableStx,
  tokens,
  nfts,
  estimateFee,
}: BuildMovePlanArgs): Promise<MovePlan> {
  const assetTransfers = [
    ...tokens.map(token => ({
      label: token.symbol,
      build(context: TransferContext) {
        return createSip10TransferTx(token, context);
      },
    })),
    ...nfts.map(nft => ({
      label: nft.name,
      build(context: TransferContext) {
        return createSip9TransferTx(nft, context);
      },
    })),
  ];

  const transactions: MoveTransaction[] = [];
  for (const [index, transfer] of assetTransfers.entries()) {
    const context = { sender, recipient, network, nonce: startNonce + index, fee: zeroFee };
    const estimateTx = await transfer.build(context);
    const fee = await estimateFee(estimateTx);
    const unsignedTx = await transfer.build({ ...context, fee });
    transactions.push({ label: transfer.label, unsignedTx, fee });
  }

  const stxContext = {
    sender,
    recipient,
    network,
    nonce: startNonce + assetTransfers.length,
    fee: zeroFee,
  };
  const stxFee = await estimateFee(await createStxTransferTx(availableStx, stxContext));
  const fees = [...transactions.map(tx => tx.fee), stxFee];
  const stxAmount = calculateStxToMove(availableStx, fees);

  if (!stxAmount.amount.isGreaterThan(0)) return { status: 'error', message: notEnoughStxMessage };

  const stxTx = await createStxTransferTx(stxAmount, { ...stxContext, fee: stxFee });
  transactions.push({ label: 'STX', unsignedTx: stxTx, fee: stxFee });

  return { status: 'ready', transactions, stxAmount, totalFee: sumFees(fees) };
}
