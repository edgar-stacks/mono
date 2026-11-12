import type { StacksNetwork } from '@stacks/network';
import {
  PostConditionMode,
  type StacksTransactionWire,
  hexToCV,
  noneCV,
  serializeCV,
  standardPrincipalCV,
  uintCV,
} from '@stacks/transactions';

import type { Money } from '@leather.io/models';
import {
  TransactionTypes,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
} from '@leather.io/stacks';
import {
  assertUnreachable,
  createMoney,
  isError,
  subtractMoney,
  sumMoney,
} from '@leather.io/utils';

import { makeFtPostCondition, makeNftPostCondition } from '@shared/utils/post-conditions';

interface MoveSip10 {
  assetId: string;
  symbol: string;
  amount: Money;
}

export interface MoveNft {
  assetIdentifier: string;
  hex: string;
  name: string;
}

export interface MoveTransferContext {
  publicKey: string;
  senderAddress: string;
  recipient: string;
  network: StacksNetwork;
}

type MoveTransferAsset =
  | { kind: 'sip10'; token: MoveSip10 }
  | { kind: 'nft'; nft: MoveNft }
  | { kind: 'stx'; amount: Money };

type MoveTransfer = MoveTransferAsset & {
  nonce: number;
  fee: Money;
};

export interface MovePlan {
  transfers: MoveTransfer[];
  stxToMove: Money;
  totalFee: Money;
}

type MovePlanResult = { kind: 'ready'; plan: MovePlan } | { kind: 'error'; message: string };

export const notEnoughStxForFeesMessage = 'Not enough STX to pay the fees';

const zeroStx = createMoney(0, 'STX');

interface CreateTransferTxArgs {
  context: MoveTransferContext;
  nonce: number;
  fee: Money;
}

function createSip10TransferTx({
  context,
  nonce,
  fee,
  token,
}: CreateTransferTxArgs & { token: MoveSip10 }) {
  const { contractAddress, contractName, contractAssetName } = getStacksAssetStringParts(
    token.assetId
  );
  const amount = token.amount.amount.toString(10);
  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.ContractCall,
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: [
      uintCV(amount),
      standardPrincipalCV(context.senderAddress),
      standardPrincipalCV(context.recipient),
      noneCV(),
    ].map(arg => serializeCV(arg)),
    postConditions: [
      makeFtPostCondition({
        amount,
        contractAddress,
        contractName,
        contractAssetName,
        stxAddress: context.senderAddress,
      }),
    ],
    postConditionMode: PostConditionMode.Deny,
    publicKey: context.publicKey,
    network: context.network,
    fee,
    nonce,
  });
}

function createNftTransferTx({
  context,
  nonce,
  fee,
  nft,
}: CreateTransferTxArgs & { nft: MoveNft }) {
  const { contractAddress, contractName, contractAssetName } = getStacksAssetStringParts(
    nft.assetIdentifier
  );
  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.ContractCall,
    contractAddress,
    contractName,
    functionName: 'transfer',
    functionArgs: [
      hexToCV(nft.hex),
      standardPrincipalCV(context.senderAddress),
      standardPrincipalCV(context.recipient),
    ].map(arg => serializeCV(arg)),
    postConditions: [
      makeNftPostCondition({
        assetId: nft.hex,
        contractAddress,
        contractName,
        contractAssetName,
        stxAddress: context.senderAddress,
      }),
    ],
    postConditionMode: PostConditionMode.Deny,
    publicKey: context.publicKey,
    network: context.network,
    fee,
    nonce,
  });
}

function createStxTransferTx({
  context,
  nonce,
  fee,
  amount,
}: CreateTransferTxArgs & { amount: Money }) {
  return generateStacksUnsignedTransaction({
    txType: TransactionTypes.StxTokenTransfer,
    recipient: context.recipient,
    amount,
    publicKey: context.publicKey,
    network: context.network,
    fee,
    nonce,
  });
}

export function calculateStxToMove(availableStx: Money, fees: Money[]) {
  return subtractMoney(availableStx, sumMoney([zeroStx, ...fees]));
}

function createTransferTx(context: MoveTransferContext, transfer: MoveTransfer) {
  const { nonce, fee } = transfer;
  switch (transfer.kind) {
    case 'sip10':
      return createSip10TransferTx({ context, nonce, fee, token: transfer.token });
    case 'nft':
      return createNftTransferTx({ context, nonce, fee, nft: transfer.nft });
    case 'stx':
      return createStxTransferTx({ context, nonce, fee, amount: transfer.amount });
    default:
      return assertUnreachable(transfer);
  }
}

export function createUnsignedMoveTransactions(context: MoveTransferContext, plan: MovePlan) {
  return Promise.all(plan.transfers.map(transfer => createTransferTx(context, transfer)));
}

interface BuildMovePlanArgs {
  context: MoveTransferContext;
  nonce: number;
  availableStx: Money;
  sip10s: MoveSip10[];
  nfts: MoveNft[];
  estimateFee(unsignedTx: StacksTransactionWire): Promise<Money>;
}
export async function buildMovePlan({
  context,
  nonce,
  availableStx,
  sip10s,
  nfts,
  estimateFee,
}: BuildMovePlanArgs): Promise<MovePlanResult> {
  const assets: MoveTransferAsset[] = [
    ...sip10s.map((token): MoveTransferAsset => ({ kind: 'sip10', token })),
    ...nfts.map((nft): MoveTransferAsset => ({ kind: 'nft', nft })),
  ];

  const tokenTransfers = await Promise.all(
    assets.map(async (asset, index) => {
      const transfer = { ...asset, nonce: nonce + index, fee: zeroStx };
      return { ...transfer, fee: await estimateFee(await createTransferTx(context, transfer)) };
    })
  );

  const stxTransferWithoutFee: MoveTransfer = {
    kind: 'stx',
    amount: availableStx,
    nonce: nonce + tokenTransfers.length,
    fee: zeroStx,
  };
  const stxFee = await estimateFee(await createTransferTx(context, stxTransferWithoutFee));
  const fees = [...tokenTransfers.map(transfer => transfer.fee), stxFee];
  const stxToMove = calculateStxToMove(availableStx, fees);

  if (!stxToMove.amount.isGreaterThan(0))
    return { kind: 'error', message: notEnoughStxForFeesMessage };

  return {
    kind: 'ready',
    plan: {
      transfers: [...tokenTransfers, { ...stxTransferWithoutFee, amount: stxToMove, fee: stxFee }],
      stxToMove,
      totalFee: sumMoney(fees),
    },
  };
}

interface BroadcastInOrderResult {
  sent: number;
  error?: string;
}
export async function broadcastInOrder<T>(
  signedTxs: T[],
  broadcast: (signedTx: T) => Promise<void>
): Promise<BroadcastInOrderResult> {
  for (const [index, signedTx] of signedTxs.entries()) {
    try {
      await broadcast(signedTx);
    } catch (error) {
      return { sent: index, error: isError(error) ? error.message : String(error) };
    }
  }
  return { sent: signedTxs.length };
}
