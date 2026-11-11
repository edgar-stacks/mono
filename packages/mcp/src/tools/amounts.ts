import BigNumber from 'bignumber.js';

export function parseDecimalAmount(amount: string, decimals: number): BigNumber | undefined {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined;
  const fractional = new BigNumber(trimmed).shiftedBy(decimals);
  if (!fractional.isInteger() || !fractional.isGreaterThan(0)) return undefined;
  return fractional;
}

export function formatFractionalAmount(amount: BigNumber, decimals: number) {
  return amount.shiftedBy(-decimals).toFixed();
}
