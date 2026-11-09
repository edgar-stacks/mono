import BigNumber from 'bignumber.js';
import { z } from 'zod';

import { type FungibleCryptoAsset } from '@leather.io/models';
import { createMoneyFromDecimal } from '@leather.io/utils';

import { McpToolError } from './tool-result';

export const decimalAmountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Expected a positive decimal amount such as 0.0015')
  .describe('Amount in whole units, for example 0.0015 for BTC or 12.5 for STX');

export function parseAmount(amount: string, asset: FungibleCryptoAsset) {
  const money = createMoneyFromDecimal(new BigNumber(amount), asset.symbol, asset.decimals);
  if (!money.amount.isGreaterThan(0)) {
    throw new McpToolError(
      'INVALID_INPUT',
      'The amount must be greater than zero.',
      'Ask the user for the amount to use.'
    );
  }
  if (!money.amount.isInteger()) {
    throw new McpToolError(
      'INVALID_INPUT',
      `${asset.symbol} supports at most ${asset.decimals} decimal places.`,
      'Round the amount to the supported precision and try again.'
    );
  }
  return money;
}
