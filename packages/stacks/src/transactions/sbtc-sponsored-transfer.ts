import {
  AuthType,
  ClarityType,
  type ClarityValue,
  PayloadType,
  type PostCondition,
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

import { formatAssetString } from '../stacks.utils';
import {
  getMemoString,
  getVerifiedSingleFungiblePostCondition,
} from './sip-10-contract-call.utils';

const sbtcTransferManyFunctionName = 'transfer-many';
const sbtcSponsoredTransferEntryCount = 2;

type BaseUnitAmount = bigint | number | string;

interface BuildSbtcTransferManyArgs {
  sender: string;
  recipient: string;
  amount: BaseUnitAmount;
  feeRecipient: string;
  fee: BaseUnitAmount;
  memo?: string;
}
export function buildSbtcTransferManyArgs({
  sender,
  recipient,
  amount,
  feeRecipient,
  fee,
  memo,
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
  contractAddress: string;
  contractName: string;
  assetName: string;
  amount: BaseUnitAmount;
  fee: BaseUnitAmount;
}
export function buildSbtcSponsoredTransferPostCondition({
  sender,
  contractAddress,
  contractName,
  assetName,
  amount,
  fee,
}: BuildSbtcSponsoredTransferPostConditionArgs): PostCondition {
  return {
    type: 'ft-postcondition',
    address: sender,
    condition: 'eq',
    amount: (BigInt(amount) + BigInt(fee)).toString(),
    asset: formatAssetString({ contractAddress, contractName, assetName }),
  };
}

export interface SbtcSponsoredTransferDetails {
  contractId: string;
  assetName: string;
  sender: string;
  recipient: string;
  amount: bigint;
  feeRecipient: string;
  fee: bigint;
  memo?: string;
}

interface TransferManyEntry {
  sender: string;
  recipient: string;
  amount: bigint;
  memo?: string;
}

function getPrincipalString(cv: ClarityValue | undefined) {
  if (cv?.type === ClarityType.PrincipalStandard || cv?.type === ClarityType.PrincipalContract)
    return cv.value;
  return null;
}

function parseTransferManyEntry(cv: ClarityValue): TransferManyEntry | null {
  if (cv.type !== ClarityType.Tuple) return null;
  const { amount, sender, to, memo } = cv.value;
  if (amount?.type !== ClarityType.UInt) return null;
  if (sender?.type !== ClarityType.PrincipalStandard) return null;
  const recipient = getPrincipalString(to);
  if (!recipient) return null;
  return {
    sender: sender.value,
    recipient,
    amount: BigInt(amount.value),
    memo: getMemoString(memo),
  };
}

export function getSbtcSponsoredTransferDetails(
  tx: StacksTransactionWire
): SbtcSponsoredTransferDetails | null {
  if (tx.auth.authType !== AuthType.Sponsored) return null;
  if (tx.payload.payloadType !== PayloadType.ContractCall) return null;
  if (tx.payload.functionName.content !== sbtcTransferManyFunctionName) return null;
  if (tx.payload.functionArgs.length !== 1) return null;

  const [entriesArg] = tx.payload.functionArgs;
  if (entriesArg.type !== ClarityType.List) return null;
  if (entriesArg.value.length !== sbtcSponsoredTransferEntryCount) return null;

  const [transfer, fee] = entriesArg.value.map(parseTransferManyEntry);
  if (!transfer || !fee) return null;
  if (transfer.sender !== fee.sender) return null;

  const postCondition = getVerifiedSingleFungiblePostCondition(tx);
  if (!postCondition) return null;

  const contractId = `${addressToString(tx.payload.contractAddress)}.${tx.payload.contractName.content}`;
  if (postCondition.contractId !== contractId) return null;
  if (postCondition.principal !== transfer.sender) return null;
  if (postCondition.amount !== transfer.amount + fee.amount) return null;

  return {
    contractId,
    assetName: postCondition.assetName,
    sender: transfer.sender,
    recipient: transfer.recipient,
    amount: transfer.amount,
    feeRecipient: fee.recipient,
    fee: fee.amount,
    memo: transfer.memo,
  };
}
