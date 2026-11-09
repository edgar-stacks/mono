import { hexToBytes } from '@noble/hashes/utils';
import type { StacksNetwork } from '@stacks/network';
import {
  ClarityType,
  type ClarityValue,
  bufferCV,
  deserializeCV,
  fetchContractMapEntry,
} from '@stacks/transactions';

import { type NetworkModes, bnsContractAddress, bnsContractName } from '@leather.io/models';
import { getHiroStacksApiClient } from '@leather.io/services';
import { getStacksAssetStringParts } from '@leather.io/stacks';

import { hiroFetchWrapper } from '@app/query/stacks/stacks-client';

interface MoveNftHolding {
  assetIdentifier: string;
  tokenIdHex: string;
  tokenIdRepr: string;
}

export interface MoveNft extends MoveNftHolding {
  name: string;
  stayBehindReason?: string;
}

const listedForSaleReason = 'Listed for sale. Unlist it to move it.';
const managerTransferableReason = 'Its namespace only allows transfers through its own app.';

export function getNftDisplayName(assetIdentifier: string, tokenIdRepr: string) {
  const assetName = assetIdentifier.split('::')[1] ?? assetIdentifier;
  const tokenId = /^u\d+$/.test(tokenIdRepr) ? tokenIdRepr.slice(1) : tokenIdRepr;
  return `${assetName} #${tokenId}`;
}

function isBnsV2Asset(assetIdentifier: string, networkMode: NetworkModes) {
  const { contractAddress, contractName } = getStacksAssetStringParts(assetIdentifier);
  return contractAddress === bnsContractAddress[networkMode] && contractName === bnsContractName;
}

function bufferToString(value: ClarityValue | undefined) {
  if (value?.type !== ClarityType.Buffer) return undefined;
  return new TextDecoder().decode(hexToBytes(value.value));
}

function unwrapClarityValue(value: ClarityValue): ClarityValue {
  if (value.type === ClarityType.OptionalSome || value.type === ClarityType.ResponseOk)
    return unwrapClarityValue(value.value);
  return value;
}

function readTupleField(value: ClarityValue, field: string) {
  const unwrapped = unwrapClarityValue(value);
  if (unwrapped.type !== ClarityType.Tuple) return undefined;
  return unwrapped.value[field];
}

interface DescribeNftContext {
  network: StacksNetwork;
  networkMode: NetworkModes;
  signal?: AbortSignal;
}

async function describeBnsV2Nft(
  holding: MoveNftHolding,
  { network, networkMode, signal }: DescribeNftContext
): Promise<MoveNft> {
  const contractAddress = bnsContractAddress[networkMode];
  const tokenId = deserializeCV(holding.tokenIdHex);
  const fallbackName = getNftDisplayName(holding.assetIdentifier, holding.tokenIdRepr);

  const bns = await getHiroStacksApiClient().callReadOnlyFunction(
    {
      contractAddress,
      contractName: bnsContractName,
      functionName: 'get-bns-from-id',
      functionArgs: [tokenId],
    },
    { signal }
  );
  const name = bufferToString(readTupleField(bns, 'name'));
  const namespace = bufferToString(readTupleField(bns, 'namespace'));
  const displayName = name && namespace ? `${name}.${namespace}` : fallbackName;

  const listing = await fetchContractMapEntry({
    contractAddress,
    contractName: bnsContractName,
    mapName: 'market',
    mapKey: tokenId,
    network,
    client: { fetch: hiroFetchWrapper },
  });
  if (listing.type !== ClarityType.OptionalNone)
    return { ...holding, name: displayName, stayBehindReason: listedForSaleReason };

  if (!namespace) return { ...holding, name: displayName };

  const namespaceProperties = await getHiroStacksApiClient().callReadOnlyFunction(
    {
      contractAddress,
      contractName: bnsContractName,
      functionName: 'get-namespace-properties',
      functionArgs: [bufferCV(new TextEncoder().encode(namespace))],
    },
    { signal }
  );
  const properties = readTupleField(namespaceProperties, 'properties');
  const managerTransferable = properties
    ? readTupleField(properties, 'manager-transferable')
    : undefined;
  if (managerTransferable?.type === ClarityType.BoolTrue)
    return { ...holding, name: displayName, stayBehindReason: managerTransferableReason };

  return { ...holding, name: displayName };
}

async function describeOtherNft(
  holding: MoveNftHolding,
  { signal }: DescribeNftContext
): Promise<MoveNft> {
  const fallbackName = getNftDisplayName(holding.assetIdentifier, holding.tokenIdRepr);
  const tokenId = deserializeCV(holding.tokenIdHex);
  if (tokenId.type !== ClarityType.UInt) return { ...holding, name: fallbackName };

  const { contractAddress, contractName } = getStacksAssetStringParts(holding.assetIdentifier);
  const metadata = await getHiroStacksApiClient().getNftMetadata(
    `${contractAddress}.${contractName}`,
    Number(tokenId.value),
    { signal }
  );
  return { ...holding, name: metadata?.name || fallbackName };
}

export async function describeNft(
  holding: MoveNftHolding,
  context: DescribeNftContext
): Promise<MoveNft> {
  try {
    if (isBnsV2Asset(holding.assetIdentifier, context.networkMode))
      return await describeBnsV2Nft(holding, context);
    return await describeOtherNft(holding, context);
  } catch {
    return { ...holding, name: getNftDisplayName(holding.assetIdentifier, holding.tokenIdRepr) };
  }
}
