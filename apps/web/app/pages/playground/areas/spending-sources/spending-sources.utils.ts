import { satToBtc } from '@leather.io/utils';

export type AddressType = 'nativeSegwit' | 'taproot';

export interface SpendingSource {
  type: AddressType;
  label: string;
  prefix: string;
  coins: number[];
  mayHoldCollectibles: boolean;
}

const feeRateSatsPerVbyte = 5;
const txOverheadVbytes = 11;
const outputVbytes = 31;
const outputCount = 2;
const inputVbytesByType: Record<AddressType, number> = {
  nativeSegwit: 68,
  taproot: 58,
};

interface SpendInput {
  sources: SpendingSource[];
  allowed: AddressType[];
  amountSats: number;
}

interface SpendPlan {
  isCovered: boolean;
  feeSats: number;
  selectedSats: number;
  spentByType: Record<AddressType, number>;
}

interface SelectionState {
  selectedSats: number;
  vbytes: number;
  spentByType: Record<AddressType, number>;
}

function feeForVbytes(vbytes: number) {
  return vbytes * feeRateSatsPerVbyte;
}

function isStateCovered(state: SelectionState, amountSats: number) {
  return state.selectedSats >= amountSats + feeForVbytes(state.vbytes);
}

export function planSpend({ sources, allowed, amountSats }: SpendInput): SpendPlan {
  const coins = sources
    .filter(source => allowed.includes(source.type))
    .flatMap(source => source.coins.map(sats => ({ type: source.type, sats })))
    .sort((a, b) => b.sats - a.sats);

  const initialState: SelectionState = {
    selectedSats: 0,
    vbytes: txOverheadVbytes + outputCount * outputVbytes,
    spentByType: { nativeSegwit: 0, taproot: 0 },
  };

  const selection = coins.reduce((state, coin) => {
    if (isStateCovered(state, amountSats)) return state;
    return {
      selectedSats: state.selectedSats + coin.sats,
      vbytes: state.vbytes + inputVbytesByType[coin.type],
      spentByType: {
        ...state.spentByType,
        [coin.type]: state.spentByType[coin.type] + coin.sats,
      },
    };
  }, initialState);

  return {
    isCovered: isStateCovered(selection, amountSats),
    feeSats: feeForVbytes(selection.vbytes),
    selectedSats: selection.selectedSats,
    spentByType: selection.spentByType,
  };
}

interface RequiredToCoverInput extends SpendInput {
  type: AddressType;
}

export function isRequiredToCover({ type, allowed, ...input }: RequiredToCoverInput) {
  const remaining = allowed.filter(allowedType => allowedType !== type);
  return !planSpend({ ...input, allowed: remaining }).isCovered;
}

export function getDefaultAllowed(sources: SpendingSource[], amountSats: number): AddressType[] {
  const allTypes = sources.map(source => source.type);
  const withoutCollectibleTypes = sources
    .filter(source => !source.mayHoldCollectibles)
    .map(source => source.type);
  const isCoveredWithoutCollectibleTypes = planSpend({
    sources,
    allowed: withoutCollectibleTypes,
    amountSats,
  }).isCovered;
  return isCoveredWithoutCollectibleTypes ? withoutCollectibleTypes : allTypes;
}

export function formatBtc(sats: number) {
  return `${satToBtc(sats).toFormat()} BTC`;
}
