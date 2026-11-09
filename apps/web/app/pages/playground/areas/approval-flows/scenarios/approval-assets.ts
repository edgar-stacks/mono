const approvalAssets = {
  BTC: { symbol: 'BTC', name: 'Bitcoin', decimals: 8, usdPrice: 68_000 },
  STX: { symbol: 'STX', name: 'Stacks', decimals: 6, usdPrice: 1.6 },
  sBTC: { symbol: 'sBTC', name: 'sBTC', decimals: 8, usdPrice: 68_000 },
  aeUSDC: { symbol: 'aeUSDC', name: 'Bridged USDC', decimals: 6, usdPrice: 1 },
} as const;

export type ApprovalAssetSymbol = keyof typeof approvalAssets;

export const approvalAssetSymbols = [
  'BTC',
  'STX',
  'sBTC',
  'aeUSDC',
] as const satisfies readonly ApprovalAssetSymbol[];

export interface AssetAmount {
  asset: ApprovalAssetSymbol;
  baseUnits: number;
}

const maximumDisplayDecimals = 8;
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function assetAmount(asset: ApprovalAssetSymbol, units: number): AssetAmount {
  return { asset, baseUnits: Math.round(units * 10 ** approvalAssets[asset].decimals) };
}

function toUnits({ asset, baseUnits }: AssetAmount) {
  return baseUnits / 10 ** approvalAssets[asset].decimals;
}

export function formatAssetAmount(amount: AssetAmount, { signed = false } = {}) {
  const units = toUnits(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Math.min(approvalAssets[amount.asset].decimals, maximumDisplayDecimals),
  }).format(Math.abs(units));
  const sign = signed ? (signFor(units) ?? '') : '';
  return `${sign}${formatted} ${approvalAssets[amount.asset].symbol}`;
}

export function toUsd(amount: AssetAmount) {
  return toUnits(amount) * approvalAssets[amount.asset].usdPrice;
}

export function formatUsd(value: number, { signed = false } = {}) {
  const sign = signed ? (signFor(value) ?? '') : '';
  return `${sign}${usdFormatter.format(Math.abs(value))}`;
}

function signFor(value: number) {
  if (value > 0) return '+';
  if (value < 0) return '−';
  return null;
}
