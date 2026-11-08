import type { FungibleCryptoAsset, Money, QuoteCurrency } from '@leather.io/models';
import type { AssetListItem } from '@leather.io/services';
import { type SerializedCryptoAssetId, createMoney } from '@leather.io/utils';

export interface VaultAssetItem {
  id: SerializedCryptoAssetId;
  asset: FungibleCryptoAsset;
  crypto: Money;
  fiat: Money | null;
}

function isPinnedVaultAsset(asset: FungibleCryptoAsset) {
  return asset.protocol === 'nativeBtc' || asset.protocol === 'nativeStx';
}

function hasPositiveBalance(item: AssetListItem) {
  return item.balance !== undefined && Number(item.balance.crypto.totalBalance.amount) > 0;
}

function getVaultAssetFiat(item: AssetListItem, quoteCurrency: QuoteCurrency): Money | null {
  if (item.balance === undefined) return createMoney(0, quoteCurrency);
  const fiat = item.balance.quote.totalBalance;
  if (hasPositiveBalance(item) && fiat.amount.isZero()) return null;
  return fiat;
}

function compareVaultAssetItems(a: VaultAssetItem, b: VaultAssetItem) {
  const aPinned = isPinnedVaultAsset(a.asset);
  const bPinned = isPinnedVaultAsset(b.asset);
  if (aPinned !== bPinned) return aPinned ? -1 : 1;

  if (a.fiat === null || b.fiat === null) {
    if (a.fiat !== b.fiat) return a.fiat === null ? 1 : -1;
  } else {
    const fiatDiff = Number(b.fiat.amount) - Number(a.fiat.amount);
    if (fiatDiff !== 0) return fiatDiff;
  }

  return a.asset.symbol.localeCompare(b.asset.symbol);
}

export function buildVaultAssetItems(
  items: AssetListItem[],
  quoteCurrency: QuoteCurrency
): VaultAssetItem[] {
  return items
    .filter(item => hasPositiveBalance(item) || isPinnedVaultAsset(item.asset))
    .map(item => ({
      id: item.id,
      asset: item.asset,
      crypto:
        item.balance?.crypto.totalBalance ?? createMoney(0, item.asset.symbol, item.asset.decimals),
      fiat: getVaultAssetFiat(item, quoteCurrency),
    }))
    .sort(compareVaultAssetItems);
}

export function filterSendableVaultAssets(items: VaultAssetItem[]): VaultAssetItem[] {
  return items.filter(
    item => item.asset.protocol === 'nativeStx' || item.crypto.amount.isGreaterThan(0)
  );
}
