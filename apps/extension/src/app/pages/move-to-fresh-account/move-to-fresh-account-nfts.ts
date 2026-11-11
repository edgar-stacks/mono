import { bytesToUtf8, hexToBytes } from '@stacks/common';
import type { StacksNetwork } from '@stacks/network';
import {
  ClarityType,
  type ClarityValue,
  bufferCV,
  fetchCallReadOnlyFunction,
  fetchContractMapEntry,
  hexToCV,
  uintCV,
} from '@stacks/transactions';

import { bnsContractAddress, bnsContractName } from '@leather.io/models';
import { getHiroStacksApiClient } from '@leather.io/services';
import { getStacksAssetStringParts } from '@leather.io/stacks';

import { hiroFetchWrapper } from '@app/query/stacks/stacks-client';

const bnsListedReason = 'Listed for sale. Unlist it to move it.';
const bnsManagedNamespaceReason = 'Its namespace only allows transfers through its own app.';
const nonStandardNftReason = 'Its ID is not a number, so it cannot be moved with a transfer.';

interface NftHolding {
  asset_identifier: string;
  value: { hex: string; repr: string };
}

interface NftBase {
  assetIdentifier: string;
  valueHex: string;
  name: string;
}

export interface MovableNft extends NftBase {
  status: 'move';
}

interface StayingNft extends NftBase {
  status: 'stay';
  reason: string;
}

type NftDescription = MovableNft | StayingNft;

export function getNftDisplayName(assetIdentifier: string, valueRepr: string) {
  const { contractAssetName } = getStacksAssetStringParts(assetIdentifier);
  const id = valueRepr.startsWith('u') ? valueRepr.slice(1) : valueRepr;
  return `${contractAssetName} #${id}`;
}

function isBnsV2AssetIdentifier(assetIdentifier: string) {
  const { contractAddress, contractName, contractAssetName } =
    getStacksAssetStringParts(assetIdentifier);
  return (
    (contractAddress === bnsContractAddress.mainnet ||
      contractAddress === bnsContractAddress.testnet) &&
    contractName === bnsContractName &&
    contractAssetName === bnsContractName
  );
}

function getBufferHex(value: ClarityValue | undefined) {
  if (value?.type !== ClarityType.Buffer) return null;
  return value.value;
}

function getTupleValue(value: ClarityValue | undefined, key: string) {
  if (value?.type !== ClarityType.Tuple) return undefined;
  return value.value[key];
}

interface DescribeNftContext {
  network: StacksNetwork;
  senderAddress: string;
  signal?: AbortSignal;
}

async function describeBnsName(
  nft: NftBase,
  id: bigint,
  { network, senderAddress }: DescribeNftContext
): Promise<NftDescription> {
  const { contractAddress } = getStacksAssetStringParts(nft.assetIdentifier);
  const client = { fetch: hiroFetchWrapper };

  const [bnsName, listing] = await Promise.all([
    fetchCallReadOnlyFunction({
      contractAddress,
      contractName: bnsContractName,
      functionName: 'get-bns-from-id',
      functionArgs: [uintCV(id)],
      senderAddress,
      network,
      client,
    }),
    fetchContractMapEntry({
      contractAddress,
      contractName: bnsContractName,
      mapName: 'market',
      mapKey: uintCV(id),
      network,
      client,
    }),
  ]);

  const nameTuple = bnsName.type === ClarityType.OptionalSome ? bnsName.value : undefined;
  const nameHex = getBufferHex(getTupleValue(nameTuple, 'name'));
  const namespaceHex = getBufferHex(getTupleValue(nameTuple, 'namespace'));
  const name =
    nameHex && namespaceHex
      ? `${bytesToUtf8(hexToBytes(nameHex))}.${bytesToUtf8(hexToBytes(namespaceHex))}`
      : nft.name;

  if (listing.type !== ClarityType.OptionalNone)
    return { ...nft, name, status: 'stay', reason: bnsListedReason };

  if (!namespaceHex) return { ...nft, name, status: 'move' };

  const namespaceProperties = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName: bnsContractName,
    functionName: 'get-namespace-properties',
    functionArgs: [bufferCV(hexToBytes(namespaceHex))],
    senderAddress,
    network,
    client,
  });

  const properties = getTupleValue(
    namespaceProperties.type === ClarityType.ResponseOk ? namespaceProperties.value : undefined,
    'properties'
  );
  const managerTransferable = getTupleValue(properties, 'manager-transferable');

  if (managerTransferable?.type === ClarityType.BoolTrue)
    return { ...nft, name, status: 'stay', reason: bnsManagedNamespaceReason };

  return { ...nft, name, status: 'move' };
}

async function getNftMetadataName(nft: NftBase, id: bigint, { signal }: DescribeNftContext) {
  try {
    const { contractAddress, contractName } = getStacksAssetStringParts(nft.assetIdentifier);
    const metadata = await getHiroStacksApiClient().getNftMetadata(
      `${contractAddress}.${contractName}`,
      Number(id),
      { signal }
    );
    return metadata?.name || nft.name;
  } catch {
    return nft.name;
  }
}

export async function describeNft(
  holding: NftHolding,
  context: DescribeNftContext
): Promise<NftDescription> {
  const nft: NftBase = {
    assetIdentifier: holding.asset_identifier,
    valueHex: holding.value.hex,
    name: getNftDisplayName(holding.asset_identifier, holding.value.repr),
  };

  const value = hexToCV(holding.value.hex);
  if (value.type !== ClarityType.UInt)
    return { ...nft, status: 'stay', reason: nonStandardNftReason };

  const id = BigInt(value.value);

  if (isBnsV2AssetIdentifier(nft.assetIdentifier)) return describeBnsName(nft, id, context);

  return { ...nft, name: await getNftMetadataName(nft, id, context), status: 'move' };
}
