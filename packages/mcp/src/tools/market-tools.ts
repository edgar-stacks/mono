import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { validateStacksAddress } from '@stacks/transactions';
import { z } from 'zod';

import type { StacksTransaction } from '@leather.io/models';
import {
  getBitcoinTransactionsService,
  getBnsService,
  getMarketDataService,
  getMarketStatsService,
  getStacksTransactionsService,
} from '@leather.io/services';

import { assetReferenceDescription, describeAsset, resolveFungibleAsset } from './asset-reference';
import { getExplorerUrl, normalizeStacksTxid } from './explorer-links';
import { toolError, toolResult, upstreamError } from './tool-result';

const notFoundStatuses = [404, 422];

function isNotFoundError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('response' in error)) return false;
  const { response } = error;
  if (typeof response !== 'object' || response === null || !('status' in response)) return false;
  return typeof response.status === 'number' && notFoundStatuses.includes(response.status);
}

async function ignoreNotFound<T>(lookup: Promise<T | null>): Promise<T | null> {
  try {
    return await lookup;
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

function readStacksBlockHeight(transaction: StacksTransaction) {
  if ('block_height' in transaction) return transaction.block_height;
  if ('block' in transaction) return transaction.block.height;
  return undefined;
}

async function readStacksTransactionStatus(txid: string) {
  const normalizedTxid = normalizeStacksTxid(txid);
  const transaction = await ignoreNotFound(
    getStacksTransactionsService().getTransactionById(normalizedTxid)
  );
  if (!transaction) return null;
  const status = 'tx_status' in transaction ? transaction.tx_status : transaction.status;
  const blockHeight = readStacksBlockHeight(transaction);
  return {
    chain: 'stacks',
    txid: normalizedTxid,
    status,
    confirmed: !('receipt_time' in transaction) && status === 'success',
    ...(blockHeight !== undefined ? { blockHeight } : {}),
    explorerUrl: getExplorerUrl('stacks', normalizedTxid),
  };
}

async function readBitcoinTransactionStatus(txid: string) {
  const transaction = await ignoreNotFound(
    getBitcoinTransactionsService().getTransactionByTxId(txid)
  );
  if (!transaction) return null;
  const confirmed = transaction.height !== undefined;
  return {
    chain: 'bitcoin',
    txid,
    status: confirmed ? 'confirmed' : 'pending',
    confirmed,
    ...(confirmed ? { blockHeight: transaction.height } : {}),
    explorerUrl: getExplorerUrl('bitcoin', txid),
  };
}

async function readTransactionStatus(txid: string, chain?: 'bitcoin' | 'stacks') {
  if (chain === 'stacks') return readStacksTransactionStatus(txid);
  if (chain === 'bitcoin') return readBitcoinTransactionStatus(txid);
  if (txid.startsWith('0x')) return readStacksTransactionStatus(txid);
  const [bitcoin, stacks] = await Promise.all([
    readBitcoinTransactionStatus(txid).catch(() => null),
    readStacksTransactionStatus(txid).catch(() => null),
  ]);
  return bitcoin ?? stacks;
}

async function readMarketData(reference: string) {
  const asset = await resolveFungibleAsset(reference);
  if (!asset) return { asset: reference, error: 'ASSET_NOT_FOUND' };
  const [marketData, marketStats] = await Promise.all([
    getMarketDataService().getMarketData(asset),
    getMarketStatsService()
      .getMarketStats(asset)
      .catch(() => null),
  ]);
  return {
    asset: describeAsset(asset),
    price: marketData.price,
    ...(marketStats ? { priceChangePercent: marketStats.priceChange } : {}),
    ...(marketStats?.marketCap ? { marketCapUsd: marketStats.marketCap } : {}),
  };
}

export function registerMarketTools(server: McpServer) {
  server.registerTool(
    'get_transaction_status',
    {
      description:
        'Looks up a Bitcoin or Stacks mainnet transaction and reports whether it is pending, confirmed or failed, with an explorer link.',
      inputSchema: {
        txid: z.string().min(1),
        chain: z
          .enum(['bitcoin', 'stacks'])
          .optional()
          .describe('Leave empty to check both chains'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ txid, chain }) => {
      try {
        const status = await readTransactionStatus(txid.trim(), chain);
        if (!status) {
          return toolError(
            'INVALID_INPUT',
            'Transaction not found.',
            'A transaction can take a few seconds to reach the mempool after broadcast. Check the txid and try again shortly.'
          );
        }
        return toolResult(
          status,
          status.confirmed
            ? 'The transaction is confirmed. Report it with the explorerUrl.'
            : 'The transaction is not confirmed yet. Tell the user and check again later instead of polling in a tight loop.'
        );
      } catch (error) {
        return upstreamError(error);
      }
    }
  );

  server.registerTool(
    'get_market_data',
    {
      description: 'Gets the current USD price, price change and market cap of one or more assets.',
      inputSchema: {
        assets: z.array(z.string()).min(1).describe(assetReferenceDescription),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ assets }) => {
      try {
        const marketData = await Promise.all(assets.map(readMarketData));
        return toolResult(
          { marketData },
          'Prices are in USD. priceChangePercent is keyed by period. Call list_assets for unknown assets.'
        );
      } catch (error) {
        return upstreamError(error);
      }
    }
  );

  server.registerTool(
    'resolve_name',
    {
      description:
        'Resolves a BNS name such as muneeb.btc to its Stacks address, or a Stacks address to its primary BNS name.',
      inputSchema: { name: z.string().min(1).describe('A BNS name or a Stacks address') },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ name }) => {
      const query = name.trim();
      try {
        if (validateStacksAddress(query)) {
          const bnsName = await getBnsService().getAddressPrimaryBnsName(query);
          return toolResult(
            { address: query, name: bnsName?.fullName ?? null },
            bnsName ? 'This is the address’s primary BNS name.' : 'This address has no BNS name.'
          );
        }
        const bnsName = await getBnsService().getBnsName(query.toLowerCase());
        if (!bnsName) {
          return toolError(
            'INVALID_INPUT',
            `${query} is not a registered BNS name.`,
            'Ask the user for the full name, including the namespace, such as name.btc.'
          );
        }
        return toolResult(
          { name: bnsName.fullName, address: bnsName.owner },
          'BNS names resolve to Stacks addresses only. Confirm the address with the user before sending.'
        );
      } catch (error) {
        return upstreamError(error);
      }
    }
  );
}
