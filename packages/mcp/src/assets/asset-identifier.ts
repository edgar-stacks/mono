import BigNumber from 'bignumber.js';

import { type FungibleAssetId, type FungibleCryptoAsset } from '@leather.io/models';
import { getAssetDisplayName } from '@leather.io/utils';

const sip10AssetIdentifierPattern = /^S[PM][0-9A-Z]+\.[a-zA-Z][a-zA-Z0-9_-]*::[a-zA-Z0-9_-]+$/;

export function getAssetIdentifier(asset: FungibleCryptoAsset) {
  return asset.protocol === 'sip10' ? asset.assetId : asset.symbol;
}

export function matchesAssetQuery(asset: FungibleCryptoAsset, query: string) {
  const normalized = query.trim().toLowerCase();
  return (
    getAssetIdentifier(asset).toLowerCase() === normalized ||
    asset.symbol.toLowerCase() === normalized
  );
}

export function parseFungibleAssetId(query: string): FungibleAssetId | null {
  const trimmed = query.trim();
  if (trimmed.toUpperCase() === 'BTC') return { protocol: 'nativeBtc', id: 'BTC' };
  if (trimmed.toUpperCase() === 'STX') return { protocol: 'nativeStx', id: 'STX' };
  if (sip10AssetIdentifierPattern.test(trimmed)) return { protocol: 'sip10', id: trimmed };
  return null;
}

export function describeAsset(asset: FungibleCryptoAsset) {
  return {
    id: getAssetIdentifier(asset),
    symbol: asset.symbol,
    name: getAssetDisplayName(asset),
    chain: asset.chain,
    decimals: asset.decimals,
  };
}

export function toBaseUnits(amount: string, decimals: number) {
  const value = new BigNumber(amount);
  if (!value.isFinite() || !value.isGreaterThan(0)) return null;
  const baseUnits = value.shiftedBy(decimals);
  if (!baseUnits.isInteger()) return null;
  return baseUnits;
}
