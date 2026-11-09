import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { btcAsset, stxAsset } from '@leather.io/constants';
import {
  type AccountAddresses,
  type FungibleCryptoAsset,
  isStacksMempoolTransaction,
} from '@leather.io/models';
import {
  getActivityService,
  getAssetListService,
  getBitcoinTransactionsService,
  getBnsService,
  getMarketDataService,
  getStacksTransactionsService,
  getSwapService,
  getYieldService,
} from '@leather.io/services';
import { isValidStacksAddress } from '@leather.io/stacks';
import { getAssetId, sumMoney } from '@leather.io/utils';

import {
  describeAsset,
  matchesAssetQuery,
  parseFungibleAssetId,
  toBaseUnits,
} from '../assets/asset-identifier';
import { DEFAULT_ACTIVITY_LIMIT, MAX_ACTIVITY_LIMIT, NETWORK } from '../constants';
import { getExplorerUrl, toStacksTxid } from '../format/explorer-url';
import { type ServerContext } from '../server-context';
import { notPairedError, toolError, toolResult, upstreamError } from './tool-result';

const defaultListLimit = 50;
const maxListLimit = 200;
const notFoundStatuses = [404, 422];

const httpErrorSchema = z.object({ response: z.object({ status: z.number() }) });

function isNotFoundError(error: unknown) {
  const parsed = httpErrorSchema.safeParse(error);
  return parsed.success && notFoundStatuses.includes(parsed.data.response.status);
}

async function withUpstreamErrors<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    return upstreamError(error);
  }
}

async function getStacksTransactionStatus(txid: string) {
  try {
    const tx = await getStacksTransactionsService().getTransactionById(toStacksTxid(txid));
    if (!tx) return { status: 'not_found' };
    if (isStacksMempoolTransaction(tx)) {
      return tx.status === 'pending'
        ? { status: 'pending' }
        : { status: 'failed', reason: tx.status };
    }
    if (tx.status === 'success') return { status: 'confirmed', blockHeight: tx.block.height };
    return { status: 'failed', reason: tx.status, blockHeight: tx.block.height };
  } catch (error) {
    if (isNotFoundError(error)) return { status: 'not_found' };
    throw error;
  }
}

async function getBitcoinTransactionStatus(txid: string) {
  const tx = await getBitcoinTransactionsService().getTransactionByTxId(txid);
  if (!tx) return { status: 'not_found' };
  if (tx.height) return { status: 'confirmed', blockHeight: tx.height };
  return { status: 'pending' };
}

const transactionStatusInstructions: Record<string, string> = {
  pending:
    'The transaction is in the mempool. Check again later: Stacks blocks arrive every few seconds, Bitcoin blocks about every 10 minutes. Do not call this in a tight loop.',
  confirmed:
    'The transaction is confirmed. Tell the user, then refresh only the balances of the assets it moved with get_balances.',
  failed:
    'The transaction failed on chain. Tell the user the reason; fees may have been spent but the transfer did not happen.',
  not_found:
    'The transaction was not found. A just-broadcast transaction can take a short time to appear; check again in a minute, and check the txid and chain if it still does not appear.',
};

function getActivityForAsset(account: AccountAddresses, asset: string | undefined) {
  const service = getActivityService();
  if (!asset) return service.getActivity(account);
  const assetId = parseFungibleAssetId(asset);
  if (!assetId) return null;
  if (assetId.protocol === 'nativeBtc') return service.getActivityByAsset(account, btcAsset);
  if (assetId.protocol === 'nativeStx') return service.getActivityByAsset(account, stxAsset);
  return service.getTotalSip10ActivityByAssetId([account], assetId.id);
}

function filterByAssets<T extends { asset: FungibleCryptoAsset }>(items: T[], assets?: string[]) {
  if (!assets?.length) return items;
  return items.filter(item => assets.some(query => matchesAssetQuery(item.asset, query)));
}

export function registerReadTools(server: McpServer, context: ServerContext) {
  server.registerTool(
    'get_balances',
    {
      title: 'Get balances',
      description:
        'Get the balances of the paired account, with USD value. Pass assets to read only some of them, for example after a transaction.',
      inputSchema: {
        assets: z
          .array(z.string())
          .optional()
          .describe(
            'Asset symbols or identifiers to include, such as BTC, STX or SP….contract::token'
          ),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ assets }) => {
      const pairing = context.pairing.current;
      if (!pairing) return notPairedError();
      return withUpstreamErrors(async () => {
        const { items } = await getAssetListService().getAssetList({
          accountContext: { account: pairing.account },
          includes: { balance: true, marketData: true },
          filters: { hasBalance: true },
        });
        const selected = filterByAssets(items, assets);
        const quoteValues = selected.flatMap(item =>
          item.balance ? [item.balance.quote.totalBalance] : []
        );
        return toolResult(
          {
            network: NETWORK,
            totalValue: quoteValues.length ? sumMoney(quoteValues) : undefined,
            balances: selected.map(item => ({
              asset: describeAsset(item.asset),
              total: item.balance?.crypto.totalBalance,
              available: item.balance?.crypto.availableBalance,
              pending: item.balance?.crypto.pendingBalance,
              value: item.balance?.quote.totalBalance,
              price: item.marketData?.price,
            })),
          },
          'Amounts are in display units. Only assets with a balance are listed; an asset missing from the list has a zero balance.'
        );
      });
    }
  );

  server.registerTool(
    'list_assets',
    {
      title: 'List assets',
      description:
        'List the fungible assets Leather supports on mainnet, with prices and, when an account is paired, its balance of each.',
      inputSchema: {
        chain: z.enum(['bitcoin', 'stacks']).optional().describe('Only list assets on this chain'),
        limit: z.number().int().min(1).max(maxListLimit).optional(),
        offset: z.number().int().min(0).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ chain, limit, offset }) =>
      withUpstreamErrors(async () => {
        const pairing = context.pairing.current;
        const { items, meta } = await getAssetListService().getAssetList({
          accountContext: pairing ? { account: pairing.account } : undefined,
          includes: { balance: Boolean(pairing), marketData: true },
          filters: { chain },
          pagination: { limit: limit ?? defaultListLimit, offset: offset ?? 0 },
        });
        return toolResult(
          {
            total: meta.total,
            assets: items.map(item => ({
              ...describeAsset(item.asset),
              price: item.marketData?.price,
              balance: item.balance?.crypto.totalBalance,
            })),
          },
          'Use the id field when another tool asks for an asset. Page with offset when total is larger than the list.'
        );
      })
  );

  server.registerTool(
    'get_activity',
    {
      title: 'Get activity',
      description: 'Get recent on-chain activity of the paired account, newest first.',
      inputSchema: {
        asset: z
          .string()
          .optional()
          .describe('Only activity for this asset: BTC, STX or a SIP-10 identifier'),
        limit: z.number().int().min(1).max(MAX_ACTIVITY_LIMIT).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ asset, limit }) => {
      const pairing = context.pairing.current;
      if (!pairing) return notPairedError();
      const activityRequest = getActivityForAsset(pairing.account, asset);
      if (!activityRequest) {
        return toolError(
          'INVALID_INPUT',
          'Unknown asset.',
          'Use BTC, STX or a SIP-10 identifier from get_balances.'
        );
      }
      return withUpstreamErrors(async () => {
        const activity = await activityRequest;
        return toolResult(
          { activity: activity.slice(0, limit ?? DEFAULT_ACTIVITY_LIMIT) },
          'Summarise the activity for the user in plain language. Amounts are in display units.'
        );
      });
    }
  );

  server.registerTool(
    'get_transaction_status',
    {
      title: 'Get transaction status',
      description:
        'Check whether a Bitcoin or Stacks mainnet transaction is pending, confirmed or failed.',
      inputSchema: {
        chain: z.enum(['bitcoin', 'stacks']),
        txid: z.string().min(1),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ chain, txid }) =>
      withUpstreamErrors(async () => {
        const status =
          chain === 'bitcoin'
            ? await getBitcoinTransactionStatus(txid)
            : await getStacksTransactionStatus(txid);
        return toolResult(
          { chain, txid, ...status, explorerUrl: getExplorerUrl(chain, txid) },
          transactionStatusInstructions[status.status]
        );
      })
  );

  server.registerTool(
    'get_market_data',
    {
      title: 'Get market data',
      description: 'Get the current USD price of one or more assets.',
      inputSchema: {
        assets: z.array(z.string()).min(1).describe('BTC, STX or SIP-10 identifiers'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ assets }) => {
      const results = await Promise.all(
        assets.map(async asset => {
          const assetId = parseFungibleAssetId(asset);
          if (!assetId) return { asset, error: 'Unknown asset identifier' };
          try {
            const marketData = await getMarketDataService().getMarketDataByAssetId(assetId);
            return { asset, price: marketData.price };
          } catch {
            return { asset, error: 'No market data available' };
          }
        })
      );
      return toolResult(
        { prices: results },
        'Prices are in USD. Report missing prices as unavailable rather than estimating them.'
      );
    }
  );

  server.registerTool(
    'get_swap_quotes',
    {
      title: 'Get swap quotes',
      description:
        'Get quotes to swap an amount of one asset for another from the swap providers Leather supports. Each executable quote has a quoteId for the swap tool, valid for 5 minutes.',
      inputSchema: {
        from: z.string().describe('Asset to sell: BTC, STX or a SIP-10 identifier or symbol'),
        to: z.string().describe('Asset to buy: BTC, STX or a SIP-10 identifier or symbol'),
        amount: z.string().describe('Amount of the asset to sell, in display units such as 1.5'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ from, to, amount }) => {
      const pairing = context.pairing.current;
      if (!pairing) return notPairedError();
      return withUpstreamErrors(async () => {
        const accountRequest = { account: pairing.account };
        const swapService = getSwapService();
        const baseAssets = await swapService.getAccountBaseSwapAssets(accountRequest);
        const base = baseAssets.find(swapAsset => matchesAssetQuery(swapAsset.asset, from));
        if (!base) {
          return toolError(
            'ASSET_NOT_FOUND',
            `${from} cannot be swapped.`,
            'Pick another asset to sell.'
          );
        }
        const targetAssets = await swapService.getAccountTargetSwapAssets(
          accountRequest,
          getAssetId(base.asset)
        );
        const target = targetAssets.find(swapAsset => matchesAssetQuery(swapAsset.asset, to));
        if (!target) {
          return toolError(
            'ASSET_NOT_FOUND',
            `${from} cannot be swapped for ${to}.`,
            `Supported targets: ${targetAssets.map(swapAsset => swapAsset.asset.symbol).join(', ')}.`
          );
        }
        const baseUnits = toBaseUnits(amount, base.asset.decimals);
        if (!baseUnits) {
          return toolError(
            'INVALID_INPUT',
            `Invalid amount ${amount} for ${base.asset.symbol}.`,
            `Use a positive amount with at most ${base.asset.decimals} decimals.`
          );
        }
        const quotes = await swapService.getSwapQuotes(base, target, {
          amount: baseUnits,
          symbol: base.asset.symbol,
          decimals: base.asset.decimals,
        });
        const sorted = [...quotes].sort((a, b) =>
          b.targetAmount.amount.comparedTo(a.targetAmount.amount)
        );
        return toolResult(
          {
            from: describeAsset(base.asset),
            to: describeAsset(target.asset),
            quotes: sorted.map(quote => ({
              quoteId: quote.isExecutable ? context.swapQuotes.add(quote) : undefined,
              provider: quote.providerId,
              sell: quote.baseAmount,
              receive: quote.targetAmount,
              isExecutable: quote.isExecutable,
              executionConstraints: quote.executionConstraints,
              route: quote.assetPath.map(asset => asset.symbol),
            })),
          },
          quotes.length
            ? 'Show the user the best quotes. To swap, call swap with the chosen quoteId within 5 minutes; the default slippage is 3%. Quotes without a quoteId cannot be executed.'
            : 'No provider returned a quote. Tell the user the pair or amount is not available right now.'
        );
      });
    }
  );

  server.registerTool(
    'resolve_name',
    {
      title: 'Resolve name',
      description:
        'Resolve a BNS name such as alice.btc to its Stacks address, or a Stacks address to its primary BNS name.',
      inputSchema: {
        name: z.string().min(1).describe('A BNS name or a Stacks address'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ name }) =>
      withUpstreamErrors(async () => {
        const bnsService = getBnsService();
        if (isValidStacksAddress(name)) {
          const primary = await bnsService.getAddressPrimaryBnsName(name);
          return toolResult(
            { address: name, name: primary?.fullName ?? null },
            primary
              ? 'This is the primary BNS name of the address.'
              : 'The address has no primary BNS name.'
          );
        }
        const bnsName = await bnsService.getBnsName(name.toLowerCase());
        return toolResult(
          { name: name.toLowerCase(), address: bnsName?.owner ?? null },
          bnsName
            ? 'Before sending, confirm the resolved address with the user.'
            : 'The name is not registered. Ask the user to check the spelling.'
        );
      })
  );

  server.registerTool(
    'get_defi_positions',
    {
      title: 'Get DeFi positions',
      description:
        'Get the yield, lending and liquidity positions of the paired account across the Stacks protocols Leather supports.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const pairing = context.pairing.current;
      if (!pairing) return notPairedError();
      return withUpstreamErrors(async () => {
        const positions = await getYieldService().getAllPositions(pairing.account);
        return toolResult(
          { positions },
          positions.length
            ? 'Summarise the positions for the user. Amounts are in display units.'
            : 'The account has no DeFi positions in the protocols Leather supports.'
        );
      });
    }
  );
}
