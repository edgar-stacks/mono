import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import BigNumber from 'bignumber.js';
import { z } from 'zod';

import type { FungibleCryptoAsset, SwapQuote } from '@leather.io/models';
import { getSwapService } from '@leather.io/services';
import { createMoney, getAssetId, isSameAsset } from '@leather.io/utils';

import {
  DEFAULT_SWAP_SLIPPAGE_PERCENT,
  MAX_SWAP_SLIPPAGE_PERCENT,
  MCP_NETWORK,
  SWAP_QUOTE_TTL_MS,
} from '../constants';
import type { McpContext } from '../server/mcp-context';
import { formatFractionalAmount, parseDecimalAmount } from './amounts';
import { assetReferenceDescription, resolveFungibleAsset } from './asset-reference';
import { proposeRequest } from './propose-request';
import { notPairedError, readPairedAccount } from './require-pairing';
import {
  serializeUnknownClarityValues,
  serializeUnknownPostConditions,
} from './stacks-contract-call';
import { readErrorMessage, toolError, toolResult, upstreamError } from './tool-result';

const percentDivisor = 100;
const millisecondsPerMinute = 60_000;

function getAssetReference(asset: FungibleCryptoAsset) {
  return asset.protocol === 'sip10' ? asset.assetId : asset.symbol;
}

function formatQuoteAmount(asset: FungibleCryptoAsset, amount: BigNumber) {
  return `${formatFractionalAmount(amount, asset.decimals)} ${asset.symbol}`;
}

function describeQuote(quoteId: string, quote: SwapQuote) {
  return {
    quoteId,
    provider: quote.providerId,
    executable: quote.isExecutable && quote.executionType === 'stacks-contract-call',
    from: formatQuoteAmount(quote.baseAsset, quote.baseAmount.amount),
    to: formatQuoteAmount(quote.targetAsset, quote.targetAmount.amount),
    route: quote.assetPath.map(asset => asset.symbol),
    dexes: quote.dexPath.map(dex => dex.name),
    executionConstraints: quote.executionConstraints,
    expiresAt: new Date(Date.now() + SWAP_QUOTE_TTL_MS).toISOString(),
  };
}

async function findSwapAssets(base: FungibleCryptoAsset, target: FungibleCryptoAsset) {
  const swapService = getSwapService();
  const baseSwapAssets = await swapService.getBaseSwapAssets();
  const baseSwapAsset = baseSwapAssets.find(swapAsset => isSameAsset(swapAsset.asset, base));
  if (!baseSwapAsset) return undefined;
  const targetSwapAssets = await swapService.getTargetSwapAssets(getAssetId(base));
  const targetSwapAsset = targetSwapAssets.find(swapAsset => isSameAsset(swapAsset.asset, target));
  if (!targetSwapAsset) return undefined;
  return { baseSwapAsset, targetSwapAsset };
}

function getMinimumReceive(quote: SwapQuote, slippage: BigNumber) {
  return quote.targetAmount.amount
    .times(new BigNumber(1).minus(slippage))
    .integerValue(BigNumber.ROUND_DOWN);
}

export function registerSwapTools(server: McpServer, context: McpContext) {
  const { swapQuoteCache } = context;

  server.registerTool(
    'get_swap_quotes',
    {
      description: `Gets swap quotes between two Stacks assets (STX and SIP-10 tokens, sBTC included) from Leather's swap providers. Each quote has a quoteId to pass to swap; quotes expire after ${SWAP_QUOTE_TTL_MS / millisecondsPerMinute} minutes.`,
      inputSchema: {
        fromAsset: z.string().min(1).describe(assetReferenceDescription),
        toAsset: z.string().min(1).describe(assetReferenceDescription),
        amount: z.string().min(1).describe('Amount of fromAsset in whole units, for example 25'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ fromAsset, toAsset, amount }) => {
      try {
        const [base, target] = await Promise.all([
          resolveFungibleAsset(fromAsset),
          resolveFungibleAsset(toAsset),
        ]);
        if (!base || !target) {
          return toolError(
            'ASSET_NOT_FOUND',
            `Unknown asset: ${base ? toAsset : fromAsset}`,
            'Call list_assets to find the asset id.'
          );
        }
        const baseAmount = parseDecimalAmount(amount, base.decimals);
        if (!baseAmount) {
          return toolError(
            'INVALID_INPUT',
            `Invalid amount ${amount}.`,
            `Pass a positive ${base.symbol} amount with at most ${base.decimals} decimal places.`
          );
        }
        const swapAssets = await findSwapAssets(base, target);
        if (!swapAssets) {
          return toolError(
            'UNSUPPORTED',
            `Leather cannot swap ${base.symbol} for ${target.symbol}.`,
            'Tell the user this pair is not supported.'
          );
        }
        const quotes = await getSwapService().getSwapQuotes(
          swapAssets.baseSwapAsset,
          swapAssets.targetSwapAsset,
          createMoney(baseAmount, base.symbol, base.decimals)
        );
        const sorted = [...quotes].sort((a, b) =>
          b.targetAmount.amount.comparedTo(a.targetAmount.amount)
        );
        const described = sorted.map(quote => describeQuote(swapQuoteCache.add(quote), quote));
        return toolResult(
          { quotes: described },
          described.length
            ? 'Quotes are sorted best first. Show the user the best executable quote, then call swap with its quoteId if they want it. Fetch new quotes once these expire.'
            : 'No provider returned a quote. Tell the user, and suggest a different amount.'
        );
      } catch (error) {
        return upstreamError(error);
      }
    }
  );

  server.registerTool(
    'swap',
    {
      description: `Proposes a swap from a quote returned by get_swap_quotes. Adds a post-condition for the minimum amount to receive given slippagePercent (default ${DEFAULT_SWAP_SLIPPAGE_PERCENT}, at most ${MAX_SWAP_SLIPPAGE_PERCENT}). Returns an approval link at once; nothing moves until the user approves it in Leather.`,
      inputSchema: {
        quoteId: z.string().min(1),
        slippagePercent: z
          .number()
          .positive()
          .max(MAX_SWAP_SLIPPAGE_PERCENT)
          .optional()
          .describe(`Defaults to ${DEFAULT_SWAP_SLIPPAGE_PERCENT}`),
      },
    },
    async ({ quoteId, slippagePercent }) => {
      const account = readPairedAccount(context);
      if (!account) return notPairedError();
      if (!account.stacks) {
        return toolError(
          'UNSUPPORTED',
          'The paired account has no Stacks address.',
          'Ask the user to pair an account that has Stacks.'
        );
      }
      const quote = swapQuoteCache.get(quoteId);
      if (!quote) {
        return toolError(
          'QUOTE_NOT_FOUND',
          'This quote does not exist or has expired.',
          'Call get_swap_quotes again and use a fresh quoteId.'
        );
      }
      if (!quote.isExecutable || quote.executionType !== 'stacks-contract-call') {
        return toolError(
          'UNSUPPORTED',
          'This quote cannot be executed from here.',
          'Pick another quote whose executable flag is true.',
          { executionConstraints: quote.executionConstraints }
        );
      }

      const slippage = new BigNumber(slippagePercent ?? DEFAULT_SWAP_SLIPPAGE_PERCENT).dividedBy(
        percentDivisor
      );
      try {
        const executionData = await getSwapService().getSwapExecutionData(
          { account },
          quote,
          slippage
        );
        if (executionData.executionType !== 'stacks-contract-call') {
          return toolError(
            'UNSUPPORTED',
            'This quote cannot be executed from here.',
            'Pick another quote.'
          );
        }
        const minimumReceive = formatQuoteAmount(
          quote.targetAsset,
          getMinimumReceive(quote, slippage)
        );
        const contract = `${executionData.contractAddress}.${executionData.contractName}`;
        return proposeRequest(
          context,
          {
            requestClass: 'transaction',
            kind: 'swap',
            rpcMethod: 'stx_callContract',
            rpcParams: {
              contract,
              functionName: executionData.functionName,
              functionArgs: serializeUnknownClarityValues(executionData.functionArgs),
              postConditions: serializeUnknownPostConditions(executionData.postConditions),
              postConditionMode: 'deny',
              network: MCP_NETWORK,
            },
            title: `Swap ${formatQuoteAmount(quote.baseAsset, quote.baseAmount.amount)} for ${quote.targetAsset.symbol}`,
            summary: [
              `You pay: ${formatQuoteAmount(quote.baseAsset, quote.baseAmount.amount)}`,
              `Quoted: ${formatQuoteAmount(quote.targetAsset, quote.targetAmount.amount)}`,
              `You receive at least: ${minimumReceive} (${slippage.times(percentDivisor).toFixed()}% slippage)`,
              `Provider: ${quote.providerId}`,
              `Contract: ${contract}`,
              `From: ${account.stacks.stxAddress}`,
            ],
            chain: 'stacks',
            affectedAssets: [
              ...new Set([
                'STX',
                getAssetReference(quote.baseAsset),
                getAssetReference(quote.targetAsset),
              ]),
            ],
          },
          `Nothing has moved. Give the user the approvalUrl to approve the swap in Leather; they receive at least ${minimumReceive} or the swap fails.`
        );
      } catch (error) {
        return toolError(
          'UPSTREAM_ERROR',
          readErrorMessage(error),
          'The swap could not be prepared. Fetch fresh quotes with get_swap_quotes and try another provider.'
        );
      }
    }
  );
}
