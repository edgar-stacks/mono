import {
  AuthType,
  ClarityType,
  type ClarityValue,
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

interface BuildSbtcTransferManyArgs {
  sender: string;
  recipient: string;
  amount: bigint;
  memo?: string;
  feeRecipient: string;
  fee: bigint;
}
export function buildSbtcTransferManyArgs({
  sender,
  recipient,
  amount,
  memo,
  feeRecipient,
  fee,
}: BuildSbtcTransferManyArgs): ClarityValue[] {
  return [
    listCV([
      tupleCV({
        amount: uintCV(amount),
        sender: principalCV(sender),
        to: principalCV(recipient),
        memo: memo ? someCV(bufferCVFromString(memo)) : noneCV(),
      }),
      tupleCV({
        amount: uintCV(fee),
        sender: principalCV(sender),
        to: principalCV(feeRecipient),
        memo: noneCV(),
      }),
    ]),
  ];
}

interface BuildSbtcSponsoredTransferPostConditionArgs {
  sender: string;
  contractId: string;
  assetName: string;
  amount: bigint;
  fee: bigint;
}
export function buildSbtcSponsoredTransferPostCondition({
  sender,
  contractId,
  assetName,
  amount,
  fee,
}: BuildSbtcSponsoredTransferPostConditionArgs) {
  const [contractAddress, contractName] = contractId.split('.');
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
  to: string;
  memo: ClarityValue | undefined;
}

function parseTransferManyEntry(entry: ClarityValue): TransferManyEntry | null {
  if (entry.type !== ClarityType.Tuple) return null;
  const { amount, sender, to, memo } = entry.value;
  if (amount?.type !== ClarityType.UInt) return null;
  if (sender?.type !== ClarityType.PrincipalStandard) return null;
  if (to?.type !== ClarityType.PrincipalStandard && to?.type !== ClarityType.PrincipalContract)
    return null;
  return { amount: BigInt(amount.value), sender: sender.value, to: to.value, memo };
}

export function getSbtcSponsoredTransferDetails(
  tx: StacksTransactionWire
): SbtcSponsoredTransferDetails | null {
  if (tx.auth.authType !== AuthType.Sponsored) return null;
  if (tx.payload.payloadType !== PayloadType.ContractCall) return null;
  if (tx.payload.functionName.content !== sbtcTransferManyFunctionName) return null;
  if (tx.payload.functionArgs.length !== 1) return null;

  const [list] = tx.payload.functionArgs;
  if (list.type !== ClarityType.List || list.value.length !== 2) return null;

  const transfer = parseTransferManyEntry(list.value[0]);
  const feeTransfer = parseTransferManyEntry(list.value[1]);
  if (!transfer || !feeTransfer) return null;
  if (transfer.sender !== feeTransfer.sender) return null;

  const contractId = `${addressToString(tx.payload.contractAddress)}.${tx.payload.contractName.content}`;
  const postCondition = getVerifiedSingleFungiblePostCondition(tx, {
    contractId,
    sender: transfer.sender,
    amount: transfer.amount + feeTransfer.amount,
  });
  if (!postCondition) return null;

  return {
    contractId,
    assetName: postCondition.asset.assetName.content,
    sender: transfer.sender,
    recipient: transfer.to,
    amount: transfer.amount,
    memo: getMemoString(transfer.memo),
    feeRecipient: feeTransfer.to,
    fee: feeTransfer.amount,
  };
}
