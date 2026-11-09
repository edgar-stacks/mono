import BigNumber from 'bignumber.js';
import { z } from 'zod';

const moneySchema = z.object({
  amount: z.custom<BigNumber>(value => BigNumber.isBigNumber(value)),
  symbol: z.string(),
  decimals: z.number(),
});

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  const money = moneySchema.safeParse(value);
  if (money.success) {
    return {
      amount: money.data.amount.shiftedBy(-money.data.decimals).toFixed(),
      symbol: money.data.symbol,
    };
  }
  return value;
}

export function stringifyJson(value: unknown) {
  return JSON.stringify(value, replacer, 2);
}
