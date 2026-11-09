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

import {
  getMemoString,
  getVerifiedSingleFungiblePostCondition,
} from './sip-10-contract-call.utils';

export const sbtcTransferManyFunctionName = 'transfer-many';
const sbtcContractName = 'sbtc-token';
const sbtcSponsoredTransferEntryCount = 2;

interface BuildSbtcTransferManyArgsParams {
  sender: string;
  recipient: string;
  amount: bigint;
  memo?: string;
  feeRecipient: string;
  fee: bigint;
}

function createTransferManyEntry(amount: bigint, sender: string, recipient: string, memo?: string) {
  return tupleCV({
    amount: uintCV(amount),
    sender: principalCV(sender),
    to: principalCV(recipient),
    memo: memo ? someCV(bufferCVFromString(memo)) : noneCV(),
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
      createTransferManyEntry(amount, sender, recipient, memo),
      createTransferManyEntry(fee, sender, feeRecipient),
    ]),
  ];
}

interface BuildSbtcSponsoredTransferPostConditionParams {
  sender: string;
  contractAddress: string;
  contractName: string;
  assetName: string;
  amount: bigint;
  fee: bigint;
}

export function buildSbtcSponsoredTransferPostCondition({
  sender,
  contractAddress,
  contractName,
  assetName,
  amount,
  fee,
}: BuildSbtcSponsoredTransferPostConditionParams): FungiblePostCondition {
  return Pc.principal(sender)
    .willSendEq(amount + fee)
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
}

interface TransferManyEntry {
  amount: bigint;
  sender: string;
  recipient: string;
  memo?: string;
}

function readPrincipal(value: ClarityValue | undefined) {
  if (value?.type === ClarityType.PrincipalStandard) return value.value;
  if (value?.type === ClarityType.PrincipalContract) return value.value;
  return null;
}

function readTransferManyEntry(entry: ClarityValue): TransferManyEntry | null {
  if (entry.type !== ClarityType.Tuple) return null;
  const { amount, sender, to, memo } = entry.value;
  if (amount?.type !== ClarityType.UInt) return null;
  const senderPrincipal = readPrincipal(sender);
  const recipientPrincipal = readPrincipal(to);
  if (!senderPrincipal || !recipientPrincipal) return null;
  return {
    amount: BigInt(amount.value),
    sender: senderPrincipal,
    recipient: recipientPrincipal,
    memo: getMemoString(memo),
  };
}

export function getSbtcSponsoredTransferDetails(
  tx: StacksTransactionWire
): SbtcSponsoredTransferDetails | null {
  if (tx.auth.authType !== AuthType.Sponsored) return null;
  if (tx.payload.payloadType !== PayloadType.ContractCall) return null;
  if (tx.payload.contractName.content !== sbtcContractName) return null;
  if (tx.payload.functionName.content !== sbtcTransferManyFunctionName) return null;
  if (tx.payload.functionArgs.length !== 1) return null;

  const [listArg] = tx.payload.functionArgs;
  if (listArg.type !== ClarityType.List) return null;
  if (listArg.value.length !== sbtcSponsoredTransferEntryCount) return null;

  const [transferEntry, feeEntry] = listArg.value.map(readTransferManyEntry);
  if (!transferEntry || !feeEntry) return null;
  if (transferEntry.sender !== feeEntry.sender) return null;

  const postCondition = getVerifiedSingleFungiblePostCondition(tx);
  if (!postCondition) return null;

  const contractId = `${addressToString(tx.payload.contractAddress)}.${tx.payload.contractName.content}`;
  if (postCondition.contractId !== contractId) return null;
  if (postCondition.principal !== transferEntry.sender) return null;
  if (postCondition.amount !== transferEntry.amount + feeEntry.amount) return null;

  return {
    contractId,
    assetName: postCondition.assetName,
    sender: transferEntry.sender,
    recipient: transferEntry.recipient,
    amount: transferEntry.amount,
    memo: transferEntry.memo,
    feeRecipient: feeEntry.recipient,
    fee: feeEntry.amount,
  };
}
