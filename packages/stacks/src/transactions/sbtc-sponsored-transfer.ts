import { bytesToUtf8, hexToBytes } from '@stacks/common';
import {
  AuthType,
  ClarityType,
  type ClarityValue,
  type FungiblePostCondition,
  PayloadType,
  Pc,
  type StacksTransactionWire,
  addressToString,
  bufferCVFromString,
  listCV,
  noneCV,
  principalCV,
  someCV,
  tupleCV,
  uintCV,
} from '@stacks/transactions';

import { cleanHex } from '../stacks.utils';
import { getVerifiedSingleFungiblePostCondition } from './sip-10-contract-call.utils';

export const SBTC_TRANSFER_MANY_FUNCTION_NAME = 'transfer-many';

const sbtcSponsoredTransferEntryCount = 2;

interface BuildSbtcTransferManyArgsParams {
  sender: string;
  recipient: string;
  amount: bigint | string;
  memo?: string;
  feeRecipient: string;
  fee: bigint | string;
}

function createTransferEntry(args: {
  amount: bigint | string;
  sender: string;
  to: string;
  memo?: string;
}) {
  return tupleCV({
    amount: uintCV(args.amount),
    sender: principalCV(args.sender),
    to: principalCV(args.to),
    memo: args.memo ? someCV(bufferCVFromString(args.memo)) : noneCV(),
  });
}

export function buildSbtcTransferManyArgs({
  sender,
  recipient,
  amount,
  memo,
  feeRecipient,
  fee,
}: BuildSbtcTransferManyArgsParams): ClarityValue[] {
  return [
    listCV([
      createTransferEntry({ amount, sender, to: recipient, memo }),
      createTransferEntry({ amount: fee, sender, to: feeRecipient }),
    ]),
  ];
}

interface BuildSbtcSponsoredTransferPostConditionParams {
  sender: string;
  amount: bigint | string;
  fee: bigint | string;
  contractId: string;
  assetName: string;
}

export function buildSbtcSponsoredTransferPostCondition({
  sender,
  amount,
  fee,
  contractId,
  assetName,
}: BuildSbtcSponsoredTransferPostConditionParams): FungiblePostCondition {
  const [contractAddress, contractName] = contractId.split('.');
  return Pc.principal(sender)
    .willSendEq(BigInt(amount) + BigInt(fee))
    .ft(`${contractAddress}.${contractName}`, assetName);
}

export interface SbtcSponsoredTransferDetails {
  contractId: string;
  assetName: string;
  sender: string;
  recipient: string;
  amount: bigint;
  memo?: string;
  feeRecipient: string;
  fee: bigint;
  total: bigint;
}

interface TransferEntry {
  amount: bigint;
  sender: string;
  to: string;
  memo?: string;
}

function readPrincipal(value: ClarityValue | undefined) {
  if (!value) return null;
  if (value.type === ClarityType.PrincipalStandard) return value.value;
  if (value.type === ClarityType.PrincipalContract) return value.value;
  return null;
}

function readMemo(value: ClarityValue | undefined): string | undefined | null {
  if (!value) return null;
  if (value.type === ClarityType.OptionalNone) return undefined;
  if (value.type !== ClarityType.OptionalSome) return null;
  if (value.value.type !== ClarityType.Buffer) return null;
  return bytesToUtf8(hexToBytes(cleanHex(value.value.value)));
}

function readTransferEntry(value: ClarityValue): TransferEntry | null {
  if (value.type !== ClarityType.Tuple) return null;
  const { amount, sender, to, memo } = value.value;
  if (amount?.type !== ClarityType.UInt) return null;
  if (sender?.type !== ClarityType.PrincipalStandard) return null;
  const toPrincipal = readPrincipal(to);
  if (!toPrincipal) return null;
  const memoValue = readMemo(memo);
  if (memoValue === null) return null;
  return { amount: BigInt(amount.value), sender: sender.value, to: toPrincipal, memo: memoValue };
}

export function getSbtcSponsoredTransferDetails(
  tx: StacksTransactionWire
): SbtcSponsoredTransferDetails | null {
  if (tx.auth.authType !== AuthType.Sponsored) return null;
  if (tx.payload.payloadType !== PayloadType.ContractCall) return null;
  if (tx.payload.functionName.content !== SBTC_TRANSFER_MANY_FUNCTION_NAME) return null;
  if (tx.payload.functionArgs.length !== 1) return null;

  const [listArg] = tx.payload.functionArgs;
  if (listArg.type !== ClarityType.List) return null;
  if (listArg.value.length !== sbtcSponsoredTransferEntryCount) return null;

  const [transfer, feeTransfer] = listArg.value.map(readTransferEntry);
  if (!transfer || !feeTransfer) return null;
  if (transfer.sender !== feeTransfer.sender) return null;

  const postCondition = getVerifiedSingleFungiblePostCondition(tx);
  if (!postCondition) return null;

  const contractId = `${addressToString(tx.payload.contractAddress)}.${tx.payload.contractName.content}`;
  if (postCondition.contractId !== contractId) return null;
  if (postCondition.principal !== transfer.sender) return null;

  const total = transfer.amount + feeTransfer.amount;
  if (postCondition.amount !== total) return null;

  return {
    contractId,
    assetName: postCondition.assetName,
    sender: transfer.sender,
    recipient: transfer.to,
    amount: transfer.amount,
    memo: transfer.memo,
    feeRecipient: feeTransfer.to,
    fee: feeTransfer.amount,
    total,
  };
}
