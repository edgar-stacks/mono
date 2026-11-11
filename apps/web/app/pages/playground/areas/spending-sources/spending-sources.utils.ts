export type SpendingAddressType = 'nativeSegwit' | 'taproot';

export interface SpendingSource {
  type: SpendingAddressType;
  coinsSats: number[];
}

interface PlanSpendArgs {
  sources: SpendingSource[];
  allowed: SpendingAddressType[];
  amountSats: number;
}

interface SpendPlan {
  isCovered: boolean;
  feeSats: number;
  selectedSats: number;
  spentByType: Record<SpendingAddressType, number>;
}

const feeRateSatsPerVbyte = 5;
const txOverheadVbytes = 11;
const outputVbytes = 31;
const outputCount = 2;

const inputVbytesByType: Record<SpendingAddressType, number> = {
  nativeSegwit: 68,
  taproot: 58,
};

const collectibleTypes: SpendingAddressType[] = ['taproot'];

export function mayHoldCollectibles(type: SpendingAddressType) {
  return collectibleTypes.includes(type);
}

function calculateFeeSats(inputTypes: SpendingAddressType[]) {
  const inputsVbytes = inputTypes.reduce((total, type) => total + inputVbytesByType[type], 0);
  const vbytes = txOverheadVbytes + inputsVbytes + outputCount * outputVbytes;
  return vbytes * feeRateSatsPerVbyte;
}

export function planSpend({ sources, allowed, amountSats }: PlanSpendArgs): SpendPlan {
  const coins = sources
    .filter(source => allowed.includes(source.type))
    .flatMap(source => source.coinsSats.map(sats => ({ type: source.type, sats })))
    .sort((a, b) => b.sats - a.sats);

  const spentByType: Record<SpendingAddressType, number> = { nativeSegwit: 0, taproot: 0 };
  const inputTypes: SpendingAddressType[] = [];
  let selectedSats = 0;

  for (const coin of coins) {
    inputTypes.push(coin.type);
    spentByType[coin.type] += coin.sats;
    selectedSats += coin.sats;
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
  const withoutCollectibles = all.filter(type => !mayHoldCollectibles(type));
  if (planSpend({ sources, allowed: withoutCollectibles, amountSats }).isCovered) {
    return withoutCollectibles;
  }
  return all;
}
