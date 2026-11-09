import { btcAsset, stxAsset } from '@leather.io/constants';
import { type FungibleCryptoAsset, type Sip10Asset } from '@leather.io/models';
import { getAssetListService } from '@leather.io/services';

import { McpToolError } from './tool-result';

export const assetIdentifierDescription =
  'BTC, STX, a SIP-10 symbol such as sBTC, or a SIP-10 contract id such as SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token';

export async function listSip10Assets(signal?: AbortSignal) {
  const { items } = await getAssetListService().getAssetList(
    { filters: { protocols: ['sip10'], includeHidden: true } },
    signal
  );
  return items.map(item => item.asset).filter(asset => asset.protocol === 'sip10');
}

function matchesSip10Identifier(asset: Sip10Asset, identifier: string) {
  return (
    asset.contractId.toLowerCase() === identifier ||
    asset.assetId.toLowerCase() === identifier ||
    asset.symbol.toLowerCase() === identifier
  );
}

export function findAssets(identifier: string, sip10Assets: Sip10Asset[]): FungibleCryptoAsset[] {
  const normalized = identifier.trim().toLowerCase();
  if (normalized === 'btc') return [btcAsset];
  if (normalized === 'stx') return [stxAsset];
  return sip10Assets.filter(asset => matchesSip10Identifier(asset, normalized));
}

export function resolveAsset(identifier: string, sip10Assets: Sip10Asset[]) {
  const matches = findAssets(identifier, sip10Assets);
  if (matches.length === 0) {
    throw new McpToolError(
      'ASSET_NOT_FOUND',
      `No asset matches ${identifier}.`,
      'Call list_assets to find the symbol or contract id of the asset, then try again.'
    );
  }
  if (matches.length > 1) {
    throw new McpToolError(
      'ASSET_AMBIGUOUS',
      `Several assets match ${identifier}.`,
      'Ask the user which one they mean and pass its contract id instead of the symbol.',
      {
        candidates: matches.map(asset => ({
          symbol: asset.symbol,
          name: asset.name,
          contractId: asset.protocol === 'sip10' ? asset.contractId : undefined,
        })),
      }
    );
  }
  return matches[0];
}

export function describeAsset(asset: FungibleCryptoAsset) {
  return {
    symbol: asset.symbol,
    name: asset.name,
    protocol: asset.protocol,
    decimals: asset.decimals,
    contractId: asset.protocol === 'sip10' ? asset.contractId : undefined,
  };
}
