export type SpendingAddressType = 'nativeSegwit' | 'taproot';

export interface SpendingSource {
  type: SpendingAddressType;
  coinsSats: number[];
  mayHoldCollectibles: boolean;
}

interface SpendPlan {
  isCovered: boolean;
  feeSats: number;
  selectedSats: number;
  spentByType: Record<SpendingAddressType, number>;
}

interface PlanSpendArgs {
  sources: SpendingSource[];
  allowed: SpendingAddressType[];
  amountSats: number;
}

const feeRateSatsPerVbyte = 5;
const txOverheadVbytes = 11;
const outputVbytes = 31;
const outputCount = 2;
const inputVbytesByType: Record<SpendingAddressType, number> = {
  nativeSegwit: 68,
  taproot: 58,
};

function calculateFeeSats(inputTypes: SpendingAddressType[]) {
  const inputsVbytes = inputTypes.reduce((total, type) => total + inputVbytesByType[type], 0);
  const vbytes = txOverheadVbytes + inputsVbytes + outputVbytes * outputCount;
  return vbytes * feeRateSatsPerVbyte;
}

export function planSpend({ sources, allowed, amountSats }: PlanSpendArgs): SpendPlan {
  const coins = sources
    .filter(source => allowed.includes(source.type))
    .flatMap(source => source.coinsSats.map(valueSats => ({ type: source.type, valueSats })))
    .sort((a, b) => b.valueSats - a.valueSats);

  const spentByType: Record<SpendingAddressType, number> = { nativeSegwit: 0, taproot: 0 };
  const inputTypes: SpendingAddressType[] = [];
  let selectedSats = 0;

  for (const coin of coins) {
    inputTypes.push(coin.type);
    selectedSats += coin.valueSats;
    spentByType[coin.type] += coin.valueSats;
    const feeSats = calculateFeeSats(inputTypes);
    if (selectedSats >= amountSats + feeSats) {
      return { isCovered: true, feeSats, selectedSats, spentByType };
    }
  }

  return { isCovered: false, feeSats: calculateFeeSats(inputTypes), selectedSats, spentByType };
}

interface IsRequiredToCoverArgs {
  sources: SpendingSource[];
  type: SpendingAddressType;
  amountSats: number;
}

export function isRequiredToCover({ sources, type, amountSats }: IsRequiredToCoverArgs) {
  const rest = sources.map(source => source.type).filter(sourceType => sourceType !== type);
  return !planSpend({ sources, allowed: rest, amountSats }).isCovered;
}

interface GetDefaultAllowedArgs {
  sources: SpendingSource[];
  amountSats: number;
}

export function getDefaultAllowed({ sources, amountSats }: GetDefaultAllowedArgs) {
  const all = sources.map(source => source.type);
  const withoutCollectibles = sources
    .filter(source => !source.mayHoldCollectibles)
    .map(source => source.type);
  if (planSpend({ sources, allowed: withoutCollectibles, amountSats }).isCovered) {
    return withoutCollectibles;
  }
  return all;
}
