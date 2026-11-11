import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { AccountAddresses } from '@leather.io/models';
import {
  type AssetListItem,
  getActivityService,
  getAssetListService,
  getYieldService,
} from '@leather.io/services';

import { DEFAULT_ACTIVITY_LIMIT, MAX_ACTIVITY_LIMIT } from '../constants';
import type { McpContext } from '../server/mcp-context';
import {
  assetReferenceDescription,
  describeAsset,
  matchesAssetReference,
  resolveFungibleAsset,
} from './asset-reference';
import { notPairedError, readPairedAccount } from './require-pairing';
import { toolError, toolResult, upstreamError } from './tool-result';

function describeBalanceItem({ asset, balance, marketData }: AssetListItem) {
  return {
    ...describeAsset(asset),
    ...(balance
      ? {
          available: balance.crypto.availableBalance,
          total: balance.crypto.totalBalance,
          pending: balance.crypto.pendingBalance,
          availableQuote: balance.quote.availableBalance,
          totalQuote: balance.quote.totalBalance,
        }
      : {}),
    ...(marketData ? { price: marketData.price } : {}),
  };
}

async function readActivity(account: AccountAddresses, assetReference?: string) {
  if (!assetReference) return getActivityService().getActivity(account);
  const asset = await resolveFungibleAsset(assetReference);
  if (!asset) return undefined;
  return getActivityService().getActivityByAsset(account, asset);
}

export function registerAccountTools(server: McpServer, context: McpContext) {
  server.registerTool(
    'get_balances',
    {
      description:
        'Lists the paired account’s non-zero balances (BTC, STX and SIP-10 tokens) with available, total and pending amounts and their USD value. Pass assets to refresh only some of them.',
      inputSchema: {
        assets: z
          .array(z.string())
          .optional()
          .describe(`Only return these assets: ${assetReferenceDescription}, or a symbol`),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ assets }) => {
      const account = readPairedAccount(context);
      if (!account) return notPairedError();
      try {
        const { items } = await getAssetListService().getAssetList({
          filters: { hasBalance: true },
          includes: { balance: true, marketData: true },
          accountContext: { account },
        });
        const filtered = assets?.length
          ? items.filter(item => matchesAssetReference(item.asset, assets))
          : items;
        return toolResult(
          { balances: filtered.map(describeBalanceItem) },
          'Amounts are given in fractional units (amount) and whole units (value). Spend from the available balance; pending amounts are not confirmed yet. Do not refetch every balance after a transaction, only the assets it touched.'
        );
      } catch (error) {
        return upstreamError(error);
      }
    }
  );

  server.registerTool(
    'list_assets',
    {
      description:
        'Lists the fungible assets Leather supports on mainnet (BTC, STX and SIP-10 tokens) with their ids and USD prices. Use it to find the id of a token before sending, swapping or pricing it.',
      inputSchema: {
        chain: z.enum(['bitcoin', 'stacks']).optional(),
        search: z.string().optional().describe('Case-insensitive match on symbol, name or id'),
        limit: z.number().int().min(1).max(200).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ chain, search, limit }) => {
      try {
        const { items } = await getAssetListService().getAssetList({
          filters: chain ? { chain } : {},
          includes: { marketData: true },
        });
        const query = search?.trim().toLowerCase();
        const matching = query
          ? items.filter(({ id, asset }) =>
              [id, asset.symbol, asset.name].some(value => value.toLowerCase().includes(query))
            )
          : items;
        const limited = limit ? matching.slice(0, limit) : matching;
        return toolResult(
          { total: matching.length, assets: limited.map(describeBalanceItem) },
          'Use an asset’s symbol for BTC and STX and its assetId for SIP-10 tokens when calling other tools.'
        );
      } catch (error) {
        return upstreamError(error);
      }
    }
  );

  server.registerTool(
    'get_activity',
    {
      description:
        'Lists recent on-chain activity of the paired account (sends, receives, swaps, contract calls), newest first.',
      inputSchema: {
        asset: z.string().optional().describe(`Only activity for ${assetReferenceDescription}`),
        limit: z.number().int().min(1).max(MAX_ACTIVITY_LIMIT).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ asset, limit }) => {
      const account = readPairedAccount(context);
      if (!account) return notPairedError();
      try {
        const activity = await readActivity(account, asset);
        if (!activity) {
          return toolError(
            'ASSET_NOT_FOUND',
            `Unknown asset: ${String(asset)}`,
            'Call list_assets to find the asset id.'
          );
        }
        return toolResult(
          { activity: activity.slice(0, limit ?? DEFAULT_ACTIVITY_LIMIT), total: activity.length },
          'Timestamps are Unix seconds. Use get_transaction_status for the latest state of a single transaction.'
        );
      } catch (error) {
        return upstreamError(error);
      }
    }
  );

  server.registerTool(
    'get_defi_positions',
    {
      description:
        'Lists the paired account’s DeFi positions on Stacks: stacking, liquid staking, lending, borrowing and liquidity pools.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      const account = readPairedAccount(context);
      if (!account) return notPairedError();
      try {
        const positions = await getYieldService().getAllPositions(account);
        return toolResult(
          { positions },
          positions.length
            ? 'Summarise each position for the user by protocol, with its value.'
            : 'The account has no DeFi positions that Leather tracks.'
        );
      } catch (error) {
        return upstreamError(error);
      }
    }
  );
}
