import { hexToBytes } from '@noble/hashes/utils';
import { ClarityType, type ClarityValue, hexToCV } from '@stacks/transactions';

import { bnsContractName } from '@leather.io/models';
import type { getHiroStacksApiClient } from '@leather.io/services';
import { cleanHex, getStacksAssetStringParts } from '@leather.io/stacks';

type NftDescriptionClient = Pick<
  ReturnType<typeof getHiroStacksApiClient>,
  'callReadOnlyFunction' | 'getContractMapEntry' | 'getNftMetadata'
>;

interface NftHolding {
  assetIdentifier: string;
  hex: string;
  repr: string;
}

interface NftDescription {
  name: string;
  staysBehindReason?: string;
}

const listedForSaleReason = 'Listed for sale. Unlist it to move it.';
const managerTransferableReason = 'Its namespace only allows transfers through its own app.';
const uintReprPattern = /^u(\d+)$/;

export function getNftDisplayName(assetIdentifier: string, repr: string) {
  const { contractAssetName } = getStacksAssetStringParts(assetIdentifier);
  const id = uintReprPattern.exec(repr)?.[1] ?? repr;
  return `${contractAssetName} #${id}`;
}

function getBnsV2AssetIdentifier(bnsContractAddress: string) {
  return `${bnsContractAddress}.${bnsContractName}::${bnsContractName}`;
}

function decodeBufferHex(hex: string) {
  return new TextDecoder().decode(hexToBytes(cleanHex(hex)));
}

function unwrapOptionalTuple(value: ClarityValue) {
  const inner = value.type === ClarityType.ResponseOk ? value.value : value;
  const tuple = inner.type === ClarityType.OptionalSome ? inner.value : inner;
  return tuple.type === ClarityType.Tuple ? tuple.value : undefined;
}

interface DescribeBnsNameArgs {
  holding: NftHolding;
  client: NftDescriptionClient;
  bnsContractAddress: string;
}
async function describeBnsName({
  holding,
  client,
  bnsContractAddress,
}: DescribeBnsNameArgs): Promise<NftDescription> {
  const id = hexToCV(holding.hex);
  const contract = { contractAddress: bnsContractAddress, contractName: bnsContractName };

  const bnsName = unwrapOptionalTuple(
    await client.callReadOnlyFunction(
      { ...contract, functionName: 'get-bns-from-id', functionArgs: [id] },
      {}
    )
  );
  const nameCV = bnsName?.['name'];
  const namespaceCV = bnsName?.['namespace'];
  if (nameCV?.type !== ClarityType.Buffer || namespaceCV?.type !== ClarityType.Buffer)
    return { name: getNftDisplayName(holding.assetIdentifier, holding.repr) };

  const fullName = `${decodeBufferHex(nameCV.value)}.${decodeBufferHex(namespaceCV.value)}`;

  const listing = await client.getContractMapEntry({ ...contract, mapName: 'market', key: id });
  if (listing.type === ClarityType.OptionalSome)
    return { name: fullName, staysBehindReason: listedForSaleReason };

  const namespaceProperties = unwrapOptionalTuple(
    await client.callReadOnlyFunction(
      { ...contract, functionName: 'get-namespace-properties', functionArgs: [namespaceCV] },
      {}
    )
  );
  const properties = namespaceProperties?.['properties'];
  const managerTransferable =
    properties?.type === ClarityType.Tuple ? properties.value['manager-transferable'] : undefined;
  if (managerTransferable?.type === ClarityType.BoolTrue)
    return { name: fullName, staysBehindReason: managerTransferableReason };

  return { name: fullName };
}

interface DescribeNftArgs {
  holding: NftHolding;
  client: NftDescriptionClient;
  bnsContractAddress: string;
}
export async function describeNft({
  holding,
  client,
  bnsContractAddress,
}: DescribeNftArgs): Promise<NftDescription> {
  if (holding.assetIdentifier === getBnsV2AssetIdentifier(bnsContractAddress))
    return describeBnsName({ holding, client, bnsContractAddress });

  const fallbackName = getNftDisplayName(holding.assetIdentifier, holding.repr);
  const tokenId = uintReprPattern.exec(holding.repr)?.[1];
  if (!tokenId) return { name: fallbackName };

  try {
    const [principal] = holding.assetIdentifier.split('::');
    const metadata = await client.getNftMetadata(principal, Number(tokenId));
    return { name: metadata?.name || fallbackName };
  } catch {
    return { name: fallbackName };
  }
}
