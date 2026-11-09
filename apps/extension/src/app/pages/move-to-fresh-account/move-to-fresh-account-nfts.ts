import { hexToBytes } from '@noble/hashes/utils';
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

const bnsAssetIdentifiers = [bnsContractAddress.mainnet, bnsContractAddress.testnet].map(
  address => `${address}.${bnsContractName}::${bnsContractName}`
);

const listedForSaleReason = 'Listed for sale. Unlist it to move it.';
const managerTransferableReason = 'Its namespace only allows transfers through its own app.';

interface NftHolding {
  asset_identifier: string;
  value: { hex: string; repr: string };
}

export interface MovableNft {
  assetIdentifier: string;
  tokenHex: string;
  name: string;
}

export interface StaysBehindNft {
  name: string;
  reason: string;
}

type NftDescription =
  | { status: 'moves'; nft: MovableNft }
  | { status: 'stays'; nft: StaysBehindNft };

export function getNftDisplayName(assetIdentifier: string, repr: string) {
  const { contractAssetName } = getStacksAssetStringParts(assetIdentifier);
  const tokenId = /^u\d+$/.test(repr) ? repr.slice(1) : repr;
  return `${contractAssetName} #${tokenId}`;
}

function getUintTokenId(tokenHex: string) {
  const cv = hexToCV(tokenHex);
  return cv.type === ClarityType.UInt ? BigInt(cv.value) : undefined;
}

function getTupleField(cv: ClarityValue, field: string) {
  const value = cv.type === ClarityType.OptionalSome ? cv.value : cv;
  if (value.type !== ClarityType.Tuple) return undefined;
  return value.value[field];
}

function bufferToText(cv: ClarityValue | undefined) {
  if (!cv || cv.type !== ClarityType.Buffer) return undefined;
  return new TextDecoder().decode(hexToBytes(cv.value));
}

interface DescribeNftContext {
  network: StacksNetwork;
  senderAddress: string;
}

async function describeBnsName(
  holding: NftHolding,
  tokenId: bigint,
  { network, senderAddress }: DescribeNftContext
): Promise<NftDescription> {
  const { contractAddress, contractName } = getStacksAssetStringParts(holding.asset_identifier);
  const contract = { contractAddress, contractName, network, client: { fetch: hiroFetchWrapper } };
  const fallbackName = getNftDisplayName(holding.asset_identifier, holding.value.repr);

  const bnsName = await fetchCallReadOnlyFunction({
    ...contract,
    functionName: 'get-bns-from-id',
    functionArgs: [uintCV(tokenId)],
    senderAddress,
  });
  const nameField = getTupleField(bnsName, 'name');
  const namespaceField = getTupleField(bnsName, 'namespace');
  const name = bufferToText(nameField);
  const namespace = bufferToText(namespaceField);
  const displayName = name && namespace ? `${name}.${namespace}` : fallbackName;

  const listing = await fetchContractMapEntry({
    ...contract,
    mapName: 'market',
    mapKey: uintCV(tokenId),
  });
  if (listing.type === ClarityType.OptionalSome) {
    return { status: 'stays', nft: { name: displayName, reason: listedForSaleReason } };
  }

  if (namespaceField?.type === ClarityType.Buffer) {
    const namespaceProperties = await fetchContractMapEntry({
      ...contract,
      mapName: 'namespaces',
      mapKey: bufferCV(hexToBytes(namespaceField.value)),
    });
    const managerTransferable = getTupleField(namespaceProperties, 'manager-transferable');
    if (managerTransferable?.type === ClarityType.BoolTrue) {
      return { status: 'stays', nft: { name: displayName, reason: managerTransferableReason } };
    }
  }

  return {
    status: 'moves',
    nft: {
      assetIdentifier: holding.asset_identifier,
      tokenHex: holding.value.hex,
      name: displayName,
    },
  };
}

async function getNftMetadataName(holding: NftHolding, tokenId: bigint | undefined) {
  if (tokenId === undefined) return undefined;
  try {
    const [principal] = holding.asset_identifier.split('::');
    const metadata = await getHiroStacksApiClient().getNftMetadata(principal, Number(tokenId));
    return metadata?.name || undefined;
  } catch {
    return undefined;
  }
}

export async function describeNft(
  holding: NftHolding,
  context: DescribeNftContext
): Promise<NftDescription> {
  const tokenId = getUintTokenId(holding.value.hex);

  if (bnsAssetIdentifiers.includes(holding.asset_identifier) && tokenId !== undefined) {
    return describeBnsName(holding, tokenId, context);
  }

  const metadataName = await getNftMetadataName(holding, tokenId);
  return {
    status: 'moves',
    nft: {
      assetIdentifier: holding.asset_identifier,
      tokenHex: holding.value.hex,
      name: metadataName ?? getNftDisplayName(holding.asset_identifier, holding.value.repr),
    },
  };
}
