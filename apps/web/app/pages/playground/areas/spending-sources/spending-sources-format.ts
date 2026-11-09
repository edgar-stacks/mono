import { satToBtc } from '@leather.io/utils';

import type { SpendingSourceType } from './spending-sources.utils';

export const addressTypeDetails: Record<SpendingSourceType, { label: string; prefix: string }> = {
  nativeSegwit: { label: 'Native SegWit', prefix: 'bc1q' },
  taproot: { label: 'Taproot', prefix: 'bc1p' },
};

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatBtc(sats: number) {
  return `${satToBtc(sats).toFormat()} BTC`;
}

export function formatUsd(sats: number, btcPriceUsd: number) {
  return usdFormatter.format(satToBtc(sats).times(btcPriceUsd).toNumber());
}

export function sumCoins(coins: number[]) {
  return coins.reduce((total, sats) => total + sats, 0);
}
