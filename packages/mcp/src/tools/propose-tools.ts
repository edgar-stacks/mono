import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import BigNumber from 'bignumber.js';
import { z } from 'zod';

import { isValidBitcoinNetworkAddress } from '@leather.io/bitcoin';
import { btcAsset, stxAsset } from '@leather.io/constants';
import { type FungibleCryptoAsset } from '@leather.io/models';
import {
  rpcSendTransferNewParamsSchema,
  stxCallContract,
  stxTransferSip10Ft,
  stxTransferStx,
} from '@leather.io/rpc';
import { getBnsService, getSip10BalancesService, getSwapService } from '@leather.io/services';
import { isValidStacksAddress, stacksAddressNetwork } from '@leather.io/stacks';
import { createMoney } from '@leather.io/utils';

import { getAssetIdentifier, matchesAssetQuery, toBaseUnits } from '../assets/asset-identifier';
import { DEFAULT_SLIPPAGE_PERCENT, MAX_SLIPPAGE_PERCENT, NETWORK } from '../constants';
import { stringifyJson } from '../format/stringify-json';
import { type Pairing } from '../pairing/pairing';
import { describeRequest } from '../requests/describe-request';
import { type PendingRequestInput } from '../requests/pending-request-store';
import { type ServerContext } from '../server-context';
import {
  clarityArgsSchema,
  describeClarityArgs,
  postConditionsSchema,
  serializeClarityArgs,
  serializePostConditions,
  serializeProviderClarityArgs,
  serializeProviderPostConditions,
} from '../stacks/contract-call';
import { notPairedError, toolError, toolResult, upstreamError } from './tool-result';

const bnsNamePattern = /^[a-z0-9_-]+\.[a-z0-9_-]+$/i;
const contractIdPattern = /^(S[PM][0-9A-Z]+)\.([a-zA-Z][a-zA-Z0-9_-]*)$/;
const percentDivisor = 100;

function formatAmount(baseUnits: BigNumber, asset: FungibleCryptoAsset) {
  return `${baseUnits.shiftedBy(-asset.decimals).toFixed()} ${asset.symbol}`;
}

function proposeRequest(context: ServerContext, input: Omit<PendingRequestInput, 'requestClass'>) {
  const created = context.requests.create({ ...input, requestClass: 'transaction' });
  if (!created.created) {
    const { payload } = describeRequest(context.baseUrl, created.inFlight);
    return toolError(
      'REQUEST_IN_FLIGHT',
      `Another transaction request is still waiting for the user: ${stringifyJson(payload)}`,
      'Only one transaction request can wait at a time. Ask the user to finish the request in progress, wait for it with check_request, or cancel it with cancel_request before proposing another.'
    );
  }
  const { payload } = describeRequest(context.baseUrl, created.request);
  return toolResult(
    { ...payload, approvalUrl: payload.url },
    'Nothing has been signed or sent. Show the user the summary and ask them to open approvalUrl in the browser where Leather is installed and review the transaction in Leather. Then call check_request with requestId and waitSeconds: 50, repeating until the status is no longer pending or opened.'
  );
}

async function resolveStacksRecipient(recipient: string) {
  if (isValidStacksAddress(recipient)) {
    return stacksAddressNetwork(recipient) === NETWORK ? { address: recipient } : null;
  }
  if (!bnsNamePattern.test(recipient)) return null;
  const bnsName = await getBnsService().getBnsName(recipient.toLowerCase());
  if (!bnsName) return null;
  return { address: bnsName.owner, name: recipient.toLowerCase() };
}

function describeRecipient(recipient: { address: string; name?: string }) {
  return recipient.name
    ? `To: ${recipient.name} (${recipient.address})`
    : `To: ${recipient.address}`;
}

function invalidAmountError(amount: string, asset: FungibleCryptoAsset) {
  return toolError(
    'INVALID_INPUT',
    `Invalid amount ${amount} for ${asset.symbol}.`,
    `Use a positive amount in display units with at most ${asset.decimals} decimals.`
  );
}

function invalidRecipientError(recipient: string, chain: string) {
  return toolError(
    'INVALID_INPUT',
    `${recipient} is not a valid ${chain} mainnet recipient.`,
    'Ask the user to check the recipient. BNS names can only be used for Stacks sends.'
  );
}

interface SendAssetArgs {
  context: ServerContext;
  pairing: Pairing;
  asset: FungibleCryptoAsset;
  recipient: string;
  amount: string;
  memo?: string;
}

function proposeBtcSend({ context, asset, recipient, amount }: SendAssetArgs) {
  if (!isValidBitcoinNetworkAddress(recipient, NETWORK)) {
    return invalidRecipientError(recipient, 'Bitcoin');
  }
  const baseUnits = toBaseUnits(amount, asset.decimals);
  if (!baseUnits) return invalidAmountError(amount, asset);
  const params = rpcSendTransferNewParamsSchema.parse({
    recipients: [{ address: recipient, amount: baseUnits.toFixed() }],
    network: NETWORK,
  });
  return proposeRequest(context, {
    kind: 'send_asset',
    rpcMethod: 'sendTransfer',
    rpcParams: params,
    chain: 'bitcoin',
    assets: ['BTC'],
    summary: [
      `Send ${formatAmount(baseUnits, asset)}`,
      `To: ${recipient}`,
      'Network: Bitcoin mainnet',
    ],
  });
}

async function proposeStacksSend({
  context,
  pairing,
  asset,
  recipient,
  amount,
  memo,
}: SendAssetArgs) {
  const sender = pairing.addresses.stacks;
  if (!sender) {
    return toolError(
      'UNSUPPORTED',
      'The paired account has no Stacks address.',
      'Only Bitcoin can be sent.'
    );
  }
  const resolved = await resolveStacksRecipient(recipient);
  if (!resolved) return invalidRecipientError(recipient, 'Stacks');
  const baseUnits = toBaseUnits(amount, asset.decimals);
  if (!baseUnits) return invalidAmountError(amount, asset);

  const summary = [
    `Send ${formatAmount(baseUnits, asset)}`,
    describeRecipient(resolved),
    ...(memo ? [`Memo: ${memo}`] : []),
    'Network: Stacks mainnet',
  ];

  if (asset.protocol === 'sip10') {
    if (resolved.address.includes('.')) return invalidRecipientError(recipient, 'Stacks');
    const params = stxTransferSip10Ft.params.safeParse({
      recipient: resolved.address,
      asset: asset.assetId,
      amount: baseUnits.toFixed(),
      address: sender,
      network: NETWORK,
    });
    if (!params.success) return invalidRecipientError(recipient, 'Stacks');
    return proposeRequest(context, {
      kind: 'send_asset',
      rpcMethod: 'stx_transferSip10Ft',
      rpcParams: { ...params.data, amount: baseUnits.toFixed() },
      chain: 'stacks',
      assets: ['STX', asset.assetId],
      summary,
    });
  }

  const params = stxTransferStx.params.safeParse({
    recipient: resolved.address,
    amount: baseUnits.toFixed(),
    memo,
    address: sender,
    network: NETWORK,
  });
  if (!params.success) {
    return toolError(
      'INVALID_INPUT',
      params.error.message,
      'Check the recipient, amount and memo.'
    );
  }
  return proposeRequest(context, {
    kind: 'send_asset',
    rpcMethod: 'stx_transferStx',
    rpcParams: { ...params.data, amount: baseUnits.toFixed() },
    chain: 'stacks',
    assets: ['STX'],
    summary,
  });
}

async function findSendableAsset(pairing: Pairing, query: string) {
  const normalized = query.trim().toUpperCase();
  if (normalized === 'BTC') return btcAsset;
  if (normalized === 'STX') return stxAsset;
  const { sip10s } = await getSip10BalancesService().getSip10AccountBalance({
    account: pairing.account,
  });
  const matches = sip10s.filter(balance => matchesAssetQuery(balance.asset, query));
  return matches.length === 1 ? matches[0].asset : null;
}

export function registerProposeTools(server: McpServer, context: ServerContext) {
  server.registerTool(
    'send_asset',
    {
      title: 'Send asset',
      description:
        'Propose sending BTC, STX or a SIP-10 token from the paired account. Returns an approval link at once; nothing moves until the user approves in Leather. BNS names such as alice.btc work as recipients for Stacks sends only.',
      inputSchema: {
        asset: z.string().describe('BTC, STX, or a SIP-10 identifier or symbol the account holds'),
        recipient: z.string().describe('Bitcoin address, Stacks address or BNS name'),
        amount: z.string().describe('Amount in display units, such as 0.001'),
        memo: z.string().optional().describe('Optional memo for STX transfers'),
      },
    },
    async ({ asset: assetQuery, recipient, amount, memo }) => {
      const pairing = context.pairing.current;
      if (!pairing) return notPairedError();
      try {
        const asset = await findSendableAsset(pairing, assetQuery);
        if (!asset) {
          return toolError(
            'ASSET_NOT_FOUND',
            `The account holds no single asset matching ${assetQuery}.`,
            'Use BTC, STX or the exact SIP-10 identifier from get_balances.'
          );
        }
        const args = { context, pairing, asset, recipient: recipient.trim(), amount, memo };
        if (asset.chain === 'bitcoin') {
          if (memo) {
            return toolError(
              'UNSUPPORTED',
              'Bitcoin sends do not support a memo.',
              'Send again without a memo.'
            );
          }
          return proposeBtcSend(args);
        }
        return await proposeStacksSend(args);
      } catch (error) {
        return upstreamError(error);
      }
    }
  );

  server.registerTool(
    'call_contract',
    {
      title: 'Call contract',
      description:
        'Propose a Stacks contract call from the paired account. Arguments are typed Clarity JSON values, for example {"type":"uint","value":"100"} or {"type":"address","value":"SP…"}. Post-conditions limit what the call may transfer, for example {"type":"stx-postcondition","address":"SP…","condition":"lte","amount":"1000000"}. Returns an approval link at once; nothing happens until the user approves in Leather.',
      inputSchema: {
        contract: z.string().describe('Contract identifier, such as SP000….contract-name'),
        functionName: z.string().min(1),
        functionArgs: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe(
            'Clarity values in stacks.js JSON form: int, uint, buffer, true, false, address, contract, ok, err, none, some, list, tuple, ascii, utf8'
          ),
        postConditions: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe(
            'stx-postcondition, ft-postcondition or nft-postcondition objects; amounts in base units'
          ),
        postConditionMode: z
          .enum(['deny', 'allow'])
          .optional()
          .describe('deny (default) rejects any transfer not covered by a post-condition'),
      },
    },
    ({ contract, functionName, functionArgs, postConditions, postConditionMode }) => {
      const pairing = context.pairing.current;
      if (!pairing) return notPairedError();
      const sender = pairing.addresses.stacks;
      if (!sender) {
        return toolError(
          'UNSUPPORTED',
          'The paired account has no Stacks address.',
          'Contract calls need a Stacks account.'
        );
      }
      const contractMatch = contractIdPattern.exec(contract);
      if (!contractMatch || !isValidStacksAddress(contractMatch[1])) {
        return toolError(
          'INVALID_INPUT',
          `${contract} is not a mainnet contract identifier.`,
          'Use the form SP….contract-name.'
        );
      }
      const args = clarityArgsSchema.safeParse(functionArgs ?? []);
      if (!args.success) {
        return toolError(
          'INVALID_INPUT',
          `Invalid functionArgs: ${args.error.message}`,
          'Pass each argument as a typed Clarity JSON value.'
        );
      }
      const conditions = postConditionsSchema.safeParse(postConditions ?? []);
      if (!conditions.success) {
        return toolError(
          'INVALID_INPUT',
          `Invalid postConditions: ${conditions.error.message}`,
          'Check the post-condition objects.'
        );
      }
      const mode = postConditionMode ?? 'deny';
      const params = stxCallContract.params.parse({
        contract,
        functionName,
        functionArgs: serializeClarityArgs(args.data),
        postConditions: serializePostConditions(conditions.data),
        postConditionMode: mode,
        address: sender,
        network: NETWORK,
      });
      const argumentLines = describeClarityArgs(args.data).map(
        (arg, index) => `Argument ${index + 1}: ${arg}`
      );
      return proposeRequest(context, {
        kind: 'call_contract',
        rpcMethod: 'stx_callContract',
        rpcParams: params,
        chain: 'stacks',
        summary: [
          `Call ${contract}::${functionName}`,
          ...argumentLines,
          `Post-conditions: ${conditions.data.length} (mode: ${mode})`,
          'Network: Stacks mainnet',
        ],
      });
    }
  );

  server.registerTool(
    'swap',
    {
      title: 'Swap',
      description:
        'Propose a swap from a quote returned by get_swap_quotes. Adds a post-condition for the minimum amount to receive after slippage. Returns an approval link at once; nothing happens until the user approves in Leather.',
      inputSchema: {
        quoteId: z.string().describe('quoteId from get_swap_quotes, valid for 5 minutes'),
        slippagePercent: z
          .number()
          .gt(0)
          .max(MAX_SLIPPAGE_PERCENT)
          .optional()
          .describe(`Maximum slippage in percent, default ${DEFAULT_SLIPPAGE_PERCENT}`),
      },
    },
    async ({ quoteId, slippagePercent }) => {
      const pairing = context.pairing.current;
      if (!pairing) return notPairedError();
      const sender = pairing.addresses.stacks;
      if (!sender) {
        return toolError(
          'UNSUPPORTED',
          'The paired account has no Stacks address.',
          'Swaps need a Stacks account.'
        );
      }
      const lookup = context.swapQuotes.get(quoteId);
      if (lookup.status === 'expired') {
        return toolError(
          'QUOTE_EXPIRED',
          'The quote is older than 5 minutes.',
          'Call get_swap_quotes again and use a fresh quoteId.'
        );
      }
      if (lookup.status === 'missing') {
        return toolError(
          'QUOTE_NOT_FOUND',
          'Unknown quoteId.',
          'Call get_swap_quotes and use one of its quoteIds.'
        );
      }
      const { quote } = lookup;
      const slippage = new BigNumber(slippagePercent ?? DEFAULT_SLIPPAGE_PERCENT).dividedBy(
        percentDivisor
      );
      try {
        const execution = await getSwapService().getSwapExecutionData(
          { account: pairing.account },
          quote,
          slippage
        );
        if (execution.executionType !== 'stacks-contract-call') {
          return toolError(
            'UNSUPPORTED',
            'This quote needs a Bitcoin deposit, which this server cannot propose.',
            'Pick a quote from another provider, or ask the user to swap in Leather.'
          );
        }
        const minReceive = createMoney(
          quote.targetAmount.amount
            .times(new BigNumber(1).minus(slippage))
            .integerValue(BigNumber.ROUND_FLOOR),
          quote.targetAmount.symbol,
          quote.targetAmount.decimals
        );
        const params = stxCallContract.params.parse({
          contract: `${execution.contractAddress}.${execution.contractName}`,
          functionName: execution.functionName,
          functionArgs: serializeProviderClarityArgs(execution.functionArgs),
          postConditions: serializeProviderPostConditions(execution.postConditions),
          postConditionMode: 'deny',
          address: sender,
          network: NETWORK,
        });
        return proposeRequest(context, {
          kind: 'swap',
          rpcMethod: 'stx_callContract',
          rpcParams: params,
          chain: 'stacks',
          assets: [
            getAssetIdentifier(quote.baseAsset),
            getAssetIdentifier(quote.targetAsset),
            'STX',
          ],
          summary: [
            `Swap ${formatAmount(quote.baseAmount.amount, quote.baseAsset)} for about ${formatAmount(quote.targetAmount.amount, quote.targetAsset)}`,
            `Receive at least ${formatAmount(minReceive.amount, quote.targetAsset)} (slippage ${slippage.times(percentDivisor).toFixed()}%)`,
            `Provider: ${quote.providerId}`,
            'Network: Stacks mainnet',
          ],
        });
      } catch (error) {
        return upstreamError(error);
      }
    }
  );
}
