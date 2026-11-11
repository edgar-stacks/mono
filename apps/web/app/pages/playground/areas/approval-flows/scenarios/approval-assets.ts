export const demoAssetSymbols = [
  'BTC',
  'STX',
  'sBTC',
  'USDh',
  'aeUSDC',
  'ALEX',
  'zsBTC',
  'stSTX',
] as const;

export type DemoAssetSymbol = (typeof demoAssetSymbols)[number];

interface DemoAsset {
  symbol: DemoAssetSymbol;
  name: string;
  chain: 'bitcoin' | 'stacks';
  decimals: number;
  usdPrice: number;
}

export const demoAssets: Record<DemoAssetSymbol, DemoAsset> = {
  BTC: { symbol: 'BTC', name: 'Bitcoin', chain: 'bitcoin', decimals: 8, usdPrice: 96_000 },
  STX: { symbol: 'STX', name: 'Stacks', chain: 'stacks', decimals: 6, usdPrice: 0.62 },
  sBTC: { symbol: 'sBTC', name: 'sBTC', chain: 'stacks', decimals: 8, usdPrice: 96_000 },
  USDh: { symbol: 'USDh', name: 'Hermetica USDh', chain: 'stacks', decimals: 8, usdPrice: 1 },
  aeUSDC: { symbol: 'aeUSDC', name: 'Allbridge USDC', chain: 'stacks', decimals: 6, usdPrice: 1 },
  ALEX: { symbol: 'ALEX', name: 'ALEX', chain: 'stacks', decimals: 8, usdPrice: 0.004 },
  zsBTC: { symbol: 'zsBTC', name: 'Zest sBTC', chain: 'stacks', decimals: 8, usdPrice: 96_000 },
  stSTX: { symbol: 'stSTX', name: 'Stacked STX', chain: 'stacks', decimals: 6, usdPrice: 0.68 },
};

export interface AssetAmount {
  symbol: DemoAssetSymbol;
  amount: number;
}

export function toBaseUnits(symbol: DemoAssetSymbol, decimalAmount: number) {
  return Math.round(decimalAmount * 10 ** demoAssets[symbol].decimals);
}

export function amount(symbol: DemoAssetSymbol, decimalAmount: number): AssetAmount {
  return { symbol, amount: toBaseUnits(symbol, decimalAmount) };
}

function toDecimal({ symbol, amount: baseUnits }: AssetAmount) {
  return baseUnits / 10 ** demoAssets[symbol].decimals;
}

const maxDisplayDecimals = 8;

export function formatAssetAmount(value: AssetAmount, options: { signed?: boolean } = {}) {
  const decimal = toDecimal(value);
  const formatted = Math.abs(decimal).toLocaleString('en-US', {
    maximumFractionDigits: Math.min(demoAssets[value.symbol].decimals, maxDisplayDecimals),
  });
  return withSign(decimal, `${formatted} ${value.symbol}`, options.signed);
}

export function fiatValue(value: AssetAmount) {
  return toDecimal(value) * demoAssets[value.symbol].usdPrice;
}

export function formatFiat(usd: number, options: { signed?: boolean } = {}) {
  const formatted = Math.abs(usd).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withSign(usd, formatted, options.signed);
}

function withSign(value: number, formatted: string, signed = false) {
  if (!signed || value === 0) return formatted;
  return `${value > 0 ? '+' : '−'}${formatted}`;
}
