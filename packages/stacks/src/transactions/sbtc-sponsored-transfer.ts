import {
  AuthType,
  ClarityType,
  type ClarityValue,
  type FungiblePostCondition,
  PayloadType,
  type StacksTransactionWire,
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
const sbtcContractName = 'sbtc-token';

interface BuildSbtcTransferManyArgsArgs {
  sender: string;
  recipient: string;
  amount: bigint;
  memo?: string;
  feeRecipient: string;
  fee: bigint;
}

function createTransferEntry(
  sender: string,
  to: string,
  amount: bigint,
  memo: ClarityValue
): ClarityValue {
  return tupleCV({
    amount: uintCV(amount),
    sender: principalCV(sender),
    to: principalCV(to),
    memo,
  });
}

export function buildSbtcTransferManyArgs({
  sender,
  recipient,
  amount,
  memo,
  feeRecipient,
  fee,
}: BuildSbtcTransferManyArgsArgs): ClarityValue[] {
  return [
    listCV([
      createTransferEntry(
        sender,
        recipient,
        amount,
        memo ? someCV(bufferCVFromString(memo)) : noneCV()
      ),
      createTransferEntry(sender, feeRecipient, fee, noneCV()),
    ]),
  ];
}

interface BuildSbtcSponsoredTransferPostConditionArgs {
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
}: BuildSbtcSponsoredTransferPostConditionArgs): FungiblePostCondition {
  return {
    type: 'ft-postcondition',
    address: sender,
    condition: 'eq',
    amount: (amount + fee).toString(),
    asset: formatAssetString({ contractAddress, contractName, assetName }),
  };
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

interface SbtcTransferEntry {
  sender: string;
  to: string;
  amount: bigint;
  memo: ClarityValue;
}

function readPrincipal(value: ClarityValue | undefined) {
  if (value?.type === ClarityType.PrincipalStandard) return value.value;
  if (value?.type === ClarityType.PrincipalContract) return value.value;
  return null;
}

function readTransferEntry(entry: ClarityValue): SbtcTransferEntry | null {
  if (entry.type !== ClarityType.Tuple) return null;
  const { amount, sender, to, memo } = entry.value;
  if (amount?.type !== ClarityType.UInt) return null;
  if (sender?.type !== ClarityType.PrincipalStandard) return null;
  const toPrincipal = readPrincipal(to);
  if (!toPrincipal) return null;
  if (memo?.type !== ClarityType.OptionalNone && memo?.type !== ClarityType.OptionalSome)
    return null;
  return { sender: sender.value, to: toPrincipal, amount: BigInt(amount.value), memo };
}

export function getSbtcSponsoredTransferDetails(
  tx: StacksTransactionWire
): SbtcSponsoredTransferDetails | null {
  if (tx.auth.authType !== AuthType.Sponsored) return null;
  if (tx.payload.payloadType !== PayloadType.ContractCall) return null;
  if (tx.payload.functionName.content !== sbtcTransferManyFunctionName) return null;
  if (tx.payload.contractName.content !== sbtcContractName) return null;
  if (tx.payload.functionArgs.length !== 1) return null;

  const [entriesArg] = tx.payload.functionArgs;
  if (entriesArg.type !== ClarityType.List) return null;
  if (entriesArg.value.length !== 2) return null;

  const [transferEntry, feeEntry] = entriesArg.value.map(readTransferEntry);
  if (!transferEntry || !feeEntry) return null;
  if (transferEntry.sender !== feeEntry.sender) return null;

  const postCondition = getVerifiedSingleFungiblePostCondition(tx);
  if (!postCondition) return null;
  if (postCondition.principal !== transferEntry.sender) return null;
  if (postCondition.amount !== transferEntry.amount + feeEntry.amount) return null;

  return {
    contractId: postCondition.contractId,
    assetName: postCondition.assetName,
    sender: transferEntry.sender,
    recipient: transferEntry.to,
    amount: transferEntry.amount,
    memo: getMemoString(transferEntry.memo),
    feeRecipient: feeEntry.to,
    fee: feeEntry.amount,
  };
}
