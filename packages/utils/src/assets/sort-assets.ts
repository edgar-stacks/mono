import type { Money } from '@leather.io/models';

const pinnedAssetRank: Record<string, number> = { BTC: 0, STX: 1 };
const unpinnedAssetRank = 2;

function getAssetNameRank(name: string) {
  return pinnedAssetRank[name] ?? unpinnedAssetRank;
}

export function sortAssetsByName<T extends { name: string }>(assets: T[]): T[] {
  return [...assets].sort((a, b) => {
    const rankDifference = getAssetNameRank(a.name) - getAssetNameRank(b.name);
    if (rankDifference !== 0) return rankDifference;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

export function migratePositiveAssetBalancesToTop<T extends { balance: Money }>(assets: T[]) {
  const assetsWithPositiveBalance = assets.filter(asset => asset.balance.amount.isGreaterThan(0));
  const assetsWithZeroBalance = assets.filter(asset => asset.balance.amount.isEqualTo(0));
  return [...assetsWithPositiveBalance, ...assetsWithZeroBalance];
}
