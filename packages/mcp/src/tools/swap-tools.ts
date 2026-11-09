import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  type ClarityValue,
  type PostCondition,
  type PostConditionWire,
  postConditionToHex,
  serializeCV,
  serializePostConditionWire,
} from '@stacks/transactions';
import BigNumber from 'bignumber.js';
import { z } from 'zod';

import { type SwapAsset, type SwapQuote } from '@leather.io/models';
import { getSwapService } from '@leather.io/services';
import { getAssetId, matchesAssetId } from '@leather.io/utils';

import {
  DEFAULT_SLIPPAGE_PERCENT,
  MAINNET,
  MAX_SLIPPAGE_PERCENT,
  SWAP_QUOTE_TTL_MS,
} from '../constants';
import { type McpContext } from '../context';
import { decimalAmountSchema, parseAmount } from './amount';
import { assetIdentifierDescription, resolveAsset } from './asset-resolver';
import { createRequestResult } from './create-request';
import { requirePairing } from './require-pairing';
import { McpToolError, formatMoney, runTool, toolResult } from './tool-result';

const percentDivisor = 100;
const millisecondsPerSecond = 1000;

const clarityValueSchema = z.custom<ClarityValue>(
  value => typeof value === 'object' && value !== null && 'type' in value,
  'Invalid Clarity value in swap function args'
);
const postConditionWireSchema = z.custom<PostConditionWire>(
  value => typeof value === 'object' && value !== null && 'conditionType' in value,
  'Invalid post-condition in swap execution data'
);
const postConditionSchema = z.custom<PostCondition>(
  value => typeof value === 'object' && value !== null && 'type' in value,
  'Invalid post-condition in swap execution data'
);

function encodePostCondition(postCondition: unknown) {
  if (typeof postCondition === 'string') return postCondition;
  const wire = postConditionWireSchema.safeParse(postCondition);
  if (wire.success) return serializePostConditionWire(wire.data);
  return postConditionToHex(postConditionSchema.parse(postCondition));
}

function resolveSwapAsset(identifier: string, swapAssets: SwapAsset[], role: string) {
  const sip10Assets = swapAssets
    .map(swapAsset => swapAsset.asset)
    .filter(asset => asset.protocol === 'sip10');
  try {
    const asset = resolveAsset(identifier, sip10Assets);
    const swapAsset = swapAssets.find(candidate =>
      matchesAssetId(candidate.asset, getAssetId(asset))
    );
    if (swapAsset) return swapAsset;
  } catch (error) {
    if (!(error instanceof McpToolError) || error.code !== 'ASSET_NOT_FOUND') throw error;
  }
  throw new McpToolError(
    'ASSET_NOT_FOUND',
    `${identifier} cannot be swapped ${role}.`,
    'Tell the user this pair is not available for swaps in Leather.'
  );
}

function minimumReceive(quote: SwapQuote, slippage: BigNumber) {
  const minimum = quote.targetAmount.amount
    .times(new BigNumber(1).minus(slippage))
    .integerValue(BigNumber.ROUND_DOWN);
  return formatMoney({ ...quote.targetAmount, amount: minimum });
}

function describeQuote(quote: SwapQuote, quoteId: string) {
  return {
    quoteId,
    provider: quote.providerId,
    from: formatMoney(quote.baseAmount),
    to: formatMoney(quote.targetAmount),
    minimumReceiveAtDefaultSlippage: minimumReceive(
      quote,
      new BigNumber(DEFAULT_SLIPPAGE_PERCENT).dividedBy(percentDivisor)
    ),
    route: quote.assetPath.map(asset => asset.symbol),
    executable: quote.isExecutable && quote.executionType === 'stacks-contract-call',
    executionConstraints: quote.executionConstraints.map(constraint => ({
      reason: constraint.reason,
      threshold: formatMoney(constraint.threshold),
    })),
  };
}

export function registerSwapTools(server: McpServer, context: McpContext) {
  const { swapQuoteCache } = context;

  server.registerTool(
    'get_swap_quotes',
    {
      description:
        'Gets swap quotes for selling an amount of one asset for another on Stacks. Each quote has a quoteId to pass to swap; quotes last 5 minutes.',
      inputSchema: {
        from: z.string().describe(`Asset to sell: ${assetIdentifierDescription}`),
        to: z.string().describe(`Asset to buy: ${assetIdentifierDescription}`),
        amount: decimalAmountSchema,
      },
      annotations: { readOnlyHint: true },
    },
    ({ from, to, amount }) =>
      runTool(async () => {
        const swapService = getSwapService();
        const baseAsset = resolveSwapAsset(from, await swapService.getBaseSwapAssets(), 'from');
        const targetAsset = resolveSwapAsset(
          to,
          await swapService.getTargetSwapAssets(getAssetId(baseAsset.asset)),
          `to from ${baseAsset.asset.symbol}`
        );
        const baseAmount = parseAmount(amount, baseAsset.asset);
        const quotes = await swapService.getSwapQuotes(baseAsset, targetAsset, baseAmount);
        const sortedQuotes = [...quotes].sort((a, b) =>
          b.targetAmount.amount.comparedTo(a.targetAmount.amount)
        );
        const described = sortedQuotes.map(quote =>
          describeQuote(quote, swapQuoteCache.add(quote).quoteId)
        );
        return toolResult(
          {
            quotes: described,
            expiresInSeconds: SWAP_QUOTE_TTL_MS / millisecondsPerSecond,
          },
          described.length
            ? 'Show the user the best executable quote and its minimum receive amount. If they want it, call swap with its quoteId before it expires.'
            : 'No provider returned a quote. Tell the user the swap is not available for this amount right now.'
        );
      })
  );

  server.registerTool(
    'swap',
    {
      description:
        'Proposes a swap from a quote returned by get_swap_quotes. Adds a minimum-receive post-condition from slippagePercent (default 3, at most 50). Returns an approval link at once; nothing moves until the user approves in Leather.',
      inputSchema: {
        quoteId: z.string(),
        slippagePercent: z
          .number()
          .gt(0)
          .max(MAX_SLIPPAGE_PERCENT)
          .optional()
          .describe(`Slippage tolerance in percent, default ${DEFAULT_SLIPPAGE_PERCENT}`),
      },
    },
    ({ quoteId, slippagePercent = DEFAULT_SLIPPAGE_PERCENT }) =>
      runTool(async () => {
        const { account, addresses } = requirePairing(context);
        const quote = swapQuoteCache.get(quoteId);
        if (!quote) {
          throw new McpToolError(
            'QUOTE_NOT_FOUND',
            'The quote expired or does not exist.',
            'Call get_swap_quotes again for a fresh quote.'
          );
        }
        if (!quote.isExecutable || quote.executionType !== 'stacks-contract-call') {
          throw new McpToolError(
            'QUOTE_NOT_EXECUTABLE',
            'This quote cannot be executed from here.',
            'Pick another quote marked executable, or tell the user to swap in the Leather app.',
            { quote: describeQuote(quote, quoteId) }
          );
        }
        if (!addresses.stacks) {
          throw new McpToolError(
            'UNSUPPORTED',
            'The paired account shared no Stacks address.',
            'Ask the user to pair an account with a Stacks address using connect_wallet with force: true.'
          );
        }

        const slippage = new BigNumber(slippagePercent).dividedBy(percentDivisor);
        const executionData = await getSwapService().getSwapExecutionData(
          { account },
          quote,
          slippage
        );
        if (executionData.executionType !== 'stacks-contract-call') {
          throw new McpToolError(
            'QUOTE_NOT_EXECUTABLE',
            'This swap needs a Bitcoin transaction that only the Leather app can build.',
            'Tell the user to make this swap in the Leather app.'
          );
        }

        const functionArgs = executionData.functionArgs.map(arg =>
          serializeCV(clarityValueSchema.parse(arg))
        );
        const postConditions = executionData.postConditions.map(encodePostCondition);
        const from = formatMoney(quote.baseAmount);
        const minimum = minimumReceive(quote, slippage);

        return createRequestResult(context, {
          requestClass: 'transaction',
          chain: 'stacks',
          rpcMethod: 'stx_callContract',
          rpcParams: {
            contract: `${executionData.contractAddress}.${executionData.contractName}`,
            functionName: executionData.functionName,
            functionArgs,
            postConditions,
            postConditionMode: 'deny',
            address: addresses.stacks,
            network: MAINNET,
          },
          summary: `Swap ${from.amount} ${from.symbol} for at least ${minimum.amount} ${minimum.symbol} via ${quote.providerId} with ${slippagePercent}% slippage.`,
        });
      })
  );
}
