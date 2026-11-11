import { btcAsset, stxAsset } from '@leather.io/constants';
import type { FungibleCryptoAsset } from '@leather.io/models';
import { getSip10AssetService } from '@leather.io/services';
import { getAssetId, serializeAssetId } from '@leather.io/utils';

const sip10SerializedPrefix = 'sip10|';
const sip10AssetSeparator = '::';

export const assetReferenceDescription =
  'BTC, STX, or a SIP-10 asset identifier such as SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token (use the id from list_assets or get_balances)';

function readSip10Identifier(reference: string) {
  const identifier = reference.startsWith(sip10SerializedPrefix)
    ? reference.slice(sip10SerializedPrefix.length)
    : reference;
  return identifier.includes(sip10AssetSeparator) ? identifier : undefined;
}

export async function resolveFungibleAsset(
  reference: string
): Promise<FungibleCryptoAsset | undefined> {
  const trimmed = reference.trim();
  const upper = trimmed.toUpperCase();
  if (upper === 'BTC' || upper === 'NATIVEBTC|BTC') return btcAsset;
  if (upper === 'STX' || upper === 'NATIVESTX|STX') return stxAsset;

  const identifier = readSip10Identifier(trimmed);
  if (!identifier) return undefined;
  try {
    return await getSip10AssetService().getAsset(identifier);
  } catch {
    return undefined;
  }
}

function getAssetReferenceKeys(asset: FungibleCryptoAsset) {
  const keys = [asset.symbol.toUpperCase(), serializeAssetId(getAssetId(asset)).toUpperCase()];
  if (asset.protocol === 'sip10') keys.push(asset.assetId.toUpperCase());
  return keys;
}

export function matchesAssetReference(asset: FungibleCryptoAsset, references: string[]) {
  const keys = getAssetReferenceKeys(asset);
  return references.some(reference => keys.includes(reference.trim().toUpperCase()));
}

export function describeAsset(asset: FungibleCryptoAsset) {
  return {
    id: serializeAssetId(getAssetId(asset)),
    symbol: asset.symbol,
    name: asset.name,
    chain: asset.chain,
    protocol: asset.protocol,
    decimals: asset.decimals,
    ...(asset.protocol === 'sip10'
      ? { assetId: asset.assetId, contractId: asset.contractId, canTransfer: asset.canTransfer }
      : {}),
  };
}
