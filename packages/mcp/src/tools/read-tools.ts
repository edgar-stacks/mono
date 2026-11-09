import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type BigNumber from 'bignumber.js';
import { z } from 'zod';

import { btcAsset, stxAsset } from '@leather.io/constants';
import {
  type CryptoAsset,
  type FungibleCryptoAsset,
  type OnChainActivity,
  isStacksMempoolTransaction,
} from '@leather.io/models';
import {
  type AssetListItem,
  getActivityService,
  getAssetListService,
  getBitcoinTransactionsService,
  getBnsService,
  getMarketDataService,
  getStacksTransactionsService,
  getYieldService,
} from '@leather.io/services';
import { getAssetId, isDefined, serializeAssetId } from '@leather.io/utils';

import { MAINNET } from '../constants';
import { type McpContext } from '../context';
import { getExplorerUrl } from '../requests/request-presenter';
import {
  assetIdentifierDescription,
  describeAsset,
  listSip10Assets,
  resolveAsset,
} from './asset-resolver';
import { bnsNameRegex } from './recipient';
import { requirePairing } from './require-pairing';
import { McpToolError, formatMoney, runTool, toolResult } from './tool-result';

const defaultActivityLimit = 20;
const maxActivityLimit = 100;
const defaultAssetListLimit = 50;
const maxAssetListLimit = 200;
const maxMarketDataAssets = 20;
const millisecondsPerSecond = 1000;

function getAssetLabel(asset: CryptoAsset) {
  return asset.category === 'fungible' ? asset.symbol : asset.name;
}

function formatAmount(amount: BigNumber, asset: CryptoAsset) {
  if (asset.category !== 'fungible') return amount.toFixed();
  return amount.shiftedBy(-asset.decimals).toFixed();
}

function describeActivity(activity: OnChainActivity) {
  const base = {
    type: activity.type,
    txid: activity.txid,
    status: activity.status,
    timestamp: new Date(activity.timestamp * millisecondsPerSecond).toISOString(),
  };
  switch (activity.type) {
    case 'sendAsset':
      return {
        ...base,
        asset: getAssetLabel(activity.asset),
        amount: formatAmount(activity.amount, activity.asset),
        receivers: activity.receivers,
      };
    case 'receiveAsset':
      return {
        ...base,
        asset: getAssetLabel(activity.asset),
        amount: formatAmount(activity.amount, activity.asset),
        senders: activity.senders,
      };
    case 'lockAsset':
      return {
        ...base,
        asset: getAssetLabel(activity.asset),
        amount: formatAmount(activity.amount, activity.asset),
      };
    case 'swapAssets':
      return {
        ...base,
        fromAsset: getAssetLabel(activity.fromAsset),
        fromAmount: formatAmount(activity.fromAmount, activity.fromAsset),
        toAsset: getAssetLabel(activity.toAsset),
        toAmount: formatAmount(activity.toAmount, activity.toAsset),
      };
    case 'executeSmartContract':
      return { ...base, contractId: activity.contractId, functionName: activity.functionName };
    case 'deploySmartContract':
      return { ...base, contractId: activity.contractId };
    default:
      return base;
  }
}

function describeBalance(item: AssetListItem) {
  return {
    ...describeAsset(item.asset),
    available: item.balance ? formatMoney(item.balance.crypto.availableBalance).amount : '0',
    total: item.balance ? formatMoney(item.balance.crypto.totalBalance).amount : '0',
    pending: item.balance ? formatMoney(item.balance.crypto.pendingBalance).amount : '0',
    valueUsd: item.balance ? formatMoney(item.balance.quote.totalBalance).amount : undefined,
    priceUsd: item.marketData ? formatMoney(item.marketData.price).amount : undefined,
  };
}

async function getBitcoinTransactionStatus(txid: string) {
  const transaction = await getBitcoinTransactionsService().getTransactionByTxId(txid);
  if (!transaction) return { found: false };
  return {
    found: true,
    status: transaction.height ? 'confirmed' : 'pending',
    blockHeight: transaction.height,
  };
}

async function getStacksTransactionStatus(txid: string) {
  const transaction = await getStacksTransactionsService().getTransactionById(txid);
  if (!transaction) return { found: false };
  if (isStacksMempoolTransaction(transaction)) return { found: true, status: transaction.status };
  return {
    found: true,
    status: transaction.status,
    blockHeight: transaction.block.height,
  };
}

function matchesRequestedAsset(item: AssetListItem, assets: FungibleCryptoAsset[]) {
  return assets.some(asset => item.id === serializeAssetId(getAssetId(asset)));
}

function describeZeroBalance(asset: FungibleCryptoAsset) {
  return { ...describeAsset(asset), available: '0', total: '0', pending: '0' };
}

export function registerReadTools(server: McpServer, context: McpContext) {
  server.registerTool(
    'get_balances',
    {
      description:
        'Returns the paired account’s balances in whole units with their USD value. Without assets it returns every asset with a balance; pass assets to refresh only those.',
      inputSchema: {
        assets: z
          .array(z.string())
          .optional()
          .describe(`Only these assets: ${assetIdentifierDescription}`),
      },
      annotations: { readOnlyHint: true },
    },
    ({ assets }) =>
      runTool(async () => {
        const { account } = requirePairing(context);
        const sip10Assets = assets ? await listSip10Assets() : [];
        const requestedAssets = assets?.map(identifier => resolveAsset(identifier, sip10Assets));
        const { items } = await getAssetListService().getAssetList({
          filters: { includeHidden: true, hasBalance: true },
          includes: { balance: true, marketData: true },
          accountContext: { account },
          sort: [{ field: 'quoteTotalBalance', direction: 'desc' }],
        });
        const balances = requestedAssets
          ? requestedAssets.map(asset => {
              const item = items.find(listItem => matchesRequestedAsset(listItem, [asset]));
              return item ? describeBalance(item) : describeZeroBalance(asset);
            })
          : items.map(describeBalance);
        return toolResult(
          { network: MAINNET, balances },
          'Amounts are in whole units (BTC, STX, tokens) and values in USD. After a transaction confirms, refresh only the affected assets with the assets filter.'
        );
      })
  );

  server.registerTool(
    'list_assets',
    {
      description:
        'Lists the mainnet assets Leather supports (BTC, STX and SIP-10 tokens) with their symbol, contract id and decimals. Use query to search by symbol, name or contract id.',
      inputSchema: {
        query: z.string().optional(),
        limit: z.number().int().min(1).max(maxAssetListLimit).optional(),
        offset: z.number().int().min(0).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ query, limit = defaultAssetListLimit, offset = 0 }) =>
      runTool(async () => {
        const sip10Assets = await listSip10Assets();
        const allAssets: FungibleCryptoAsset[] = [btcAsset, stxAsset, ...sip10Assets];
        const normalizedQuery = query?.trim().toLowerCase();
        const matches = normalizedQuery
          ? allAssets.filter(asset =>
              [asset.symbol, asset.name, asset.protocol === 'sip10' ? asset.contractId : undefined]
                .filter(isDefined)
                .some(value => value.toLowerCase().includes(normalizedQuery))
            )
          : allAssets;
        return toolResult(
          {
            total: matches.length,
            offset,
            assets: matches.slice(offset, offset + limit).map(describeAsset),
          },
          'Pass a symbol or, when several tokens share a symbol, the contractId to other tools.'
        );
      })
  );

  server.registerTool(
    'get_activity',
    {
      description:
        'Returns the paired account’s recent Bitcoin and Stacks activity, newest first, with amounts in whole units.',
      inputSchema: {
        limit: z.number().int().min(1).max(maxActivityLimit).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ limit = defaultActivityLimit }) =>
      runTool(async () => {
        const { account } = requirePairing(context);
        const activity = await getActivityService().getActivity(account);
        return toolResult(
          { activity: activity.slice(0, limit).map(describeActivity) },
          'Summarise the activity for the user. Use get_transaction_status for details of one transaction.'
        );
      })
  );

  server.registerTool(
    'get_transaction_status',
    {
      description:
        'Looks up a mainnet Bitcoin or Stacks transaction by txid and reports its status.',
      inputSchema: {
        txid: z.string().min(1),
        chain: z.enum(['bitcoin', 'stacks']),
      },
      annotations: { readOnlyHint: true },
    },
    ({ txid, chain }) =>
      runTool(async () => {
        const status =
          chain === 'bitcoin'
            ? await getBitcoinTransactionStatus(txid)
            : await getStacksTransactionStatus(txid);
        return toolResult(
          { txid, chain, ...status, explorerUrl: getExplorerUrl(chain, txid) },
          status.found
            ? 'Report the status and explorerUrl. While it is pending, check again later instead of polling rapidly; once confirmed, refresh only the affected balances with get_balances.'
            : 'The transaction is not visible yet. A just-broadcast transaction can take a minute to appear; check again later.'
        );
      })
  );

  server.registerTool(
    'get_market_data',
    {
      description: 'Returns current USD prices for up to 20 assets.',
      inputSchema: {
        assets: z
          .array(z.string())
          .min(1)
          .max(maxMarketDataAssets)
          .describe(assetIdentifierDescription),
      },
      annotations: { readOnlyHint: true },
    },
    ({ assets }) =>
      runTool(async () => {
        const sip10Assets = await listSip10Assets();
        const resolved = assets.map(identifier => resolveAsset(identifier, sip10Assets));
        const prices = await Promise.all(
          resolved.map(async asset => {
            const marketData = await getMarketDataService().getMarketData(asset);
            return { ...describeAsset(asset), priceUsd: formatMoney(marketData.price).amount };
          })
        );
        return toolResult({ prices }, 'Prices are indicative USD prices, not executable quotes.');
      })
  );

  server.registerTool(
    'resolve_name',
    {
      description:
        'Resolves a BNS name such as muneeb.btc to its Stacks address, or a Stacks address to its primary BNS name.',
      inputSchema: { nameOrAddress: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    ({ nameOrAddress }) =>
      runTool(async () => {
        const value = nameOrAddress.trim();
        if (bnsNameRegex.test(value)) {
          const bnsName = await getBnsService().getBnsName(value.toLowerCase());
          if (!bnsName) {
            throw new McpToolError(
              'NAME_NOT_FOUND',
              `${value} is not a registered BNS name.`,
              'Ask the user to check the name or give an address instead.'
            );
          }
          return toolResult(
            { name: bnsName.fullName, address: bnsName.owner },
            'Confirm the resolved address with the user before sending to it.'
          );
        }
        const bnsName = await getBnsService().getAddressPrimaryBnsName(value);
        return toolResult(
          { address: value, name: bnsName?.fullName },
          bnsName
            ? 'This is the address’s primary BNS name.'
            : 'This address has no primary BNS name.'
        );
      })
  );

  server.registerTool(
    'get_defi_positions',
    {
      description:
        'Returns the paired account’s DeFi and stacking positions across the protocols Leather tracks, with balances in whole units.',
      annotations: { readOnlyHint: true },
    },
    () =>
      runTool(async () => {
        const { account } = requirePairing(context);
        const positions = await getYieldService().getAllPositions(account);
        return toolResult(
          {
            positions: positions.map(position => ({
              ...position,
              totalBalance: formatMoney(position.totalBalance),
            })),
          },
          'Summarise the positions for the user. Managing positions happens in the protocol’s own app.'
        );
      })
  );
}
