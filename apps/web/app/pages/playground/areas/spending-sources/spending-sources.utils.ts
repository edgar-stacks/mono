export type SpendingSourceType = 'nativeSegwit' | 'taproot';

export interface SpendingSource {
  type: SpendingSourceType;
  coins: number[];
  mayHoldCollectibles: boolean;
}

type SpentByType = Record<SpendingSourceType, number>;

interface SpendPlan {
  isCovered: boolean;
  feeSats: number;
  selectedSats: number;
  spentByType: SpentByType;
}

interface PlanSpendParams {
  sources: SpendingSource[];
  allowed: SpendingSourceType[];
  amountSats: number;
}

interface SelectedCoin {
  type: SpendingSourceType;
  sats: number;
}

const feeRateSatsPerVbyte = 5;
const txOverheadVbytes = 11;
const outputVbytes = 31;
const outputCount = 2;
const inputVbytesByType: Record<SpendingSourceType, number> = {
  nativeSegwit: 68,
  taproot: 58,
};

function estimateFeeSats(coins: SelectedCoin[]) {
  const inputsVbytes = coins.reduce((total, coin) => total + inputVbytesByType[coin.type], 0);
  return feeRateSatsPerVbyte * (txOverheadVbytes + inputsVbytes + outputCount * outputVbytes);
}

function sumSats(coins: SelectedCoin[]) {
  return coins.reduce((total, coin) => total + coin.sats, 0);
}

export function planSpend({ sources, allowed, amountSats }: PlanSpendParams): SpendPlan {
  const pool = sources
    .filter(source => allowed.includes(source.type))
    .flatMap(source => source.coins.map(sats => ({ type: source.type, sats })))
    .sort((a, b) => b.sats - a.sats);

  const selected: SelectedCoin[] = [];
  for (const coin of pool) {
    selected.push(coin);
    if (sumSats(selected) >= amountSats + estimateFeeSats(selected)) break;
  }

  const selectedSats = sumSats(selected);
  const feeSats = estimateFeeSats(selected);

  return {
    isCovered: selected.length > 0 && selectedSats >= amountSats + feeSats,
    feeSats,
    selectedSats,
    spentByType: {
      nativeSegwit: sumSats(selected.filter(coin => coin.type === 'nativeSegwit')),
      taproot: sumSats(selected.filter(coin => coin.type === 'taproot')),
    },
  };
}

interface IsRequiredToCoverParams {
  sources: SpendingSource[];
  type: SpendingSourceType;
  amountSats: number;
}

export function isRequiredToCover({ sources, type, amountSats }: IsRequiredToCoverParams) {
  const others = sources.filter(source => source.type !== type).map(source => source.type);
  return !planSpend({ sources, allowed: others, amountSats }).isCovered;
}

interface GetDefaultAllowedParams {
  sources: SpendingSource[];
  amountSats: number;
}

export function getDefaultAllowed({ sources, amountSats }: GetDefaultAllowedParams) {
  const all = sources.map(source => source.type);
  const withoutCollectibles = sources
    .filter(source => !source.mayHoldCollectibles)
    .map(source => source.type);

  if (withoutCollectibles.length === all.length) return all;
  if (planSpend({ sources, allowed: withoutCollectibles, amountSats }).isCovered) {
    return withoutCollectibles;
  }
  return all;
}
