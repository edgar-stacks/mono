import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { MAINNET } from '../constants';
import { type McpContext } from '../context';
import { decimalAmountSchema, parseAmount } from './amount';
import {
  assetIdentifierDescription,
  findAssets,
  listSip10Assets,
  resolveAsset,
} from './asset-resolver';
import {
  clarityJsonSchema,
  clarityJsonToHex,
  postConditionJsonSchema,
  postConditionJsonToHex,
} from './clarity-json';
import { createRequestResult } from './create-request';
import { resolveStacksRecipient, validateBitcoinRecipient } from './recipient';
import { requirePairing } from './require-pairing';
import { McpToolError, formatMoney, runTool } from './tool-result';

const contractIdRegex = /^(SP|SM)[A-Z0-9]+\.[a-zA-Z][\w-]*$/;
const maxMemoLength = 34;

function requireAddress(address: string | undefined, chainName: string) {
  if (address) return address;
  throw new McpToolError(
    'UNSUPPORTED',
    `The paired account shared no ${chainName} address.`,
    `Ask the user to pair an account with a ${chainName} address using connect_wallet with force: true.`
  );
}

async function resolveSendAsset(identifier: string) {
  const nativeMatches = findAssets(identifier, []);
  if (nativeMatches.length === 1) return nativeMatches[0];
  return resolveAsset(identifier, await listSip10Assets());
}

function toInvalidInput(error: unknown, instructions: string) {
  return new McpToolError(
    'INVALID_INPUT',
    error instanceof Error ? error.message : 'Invalid input',
    instructions
  );
}

export function registerProposeTools(server: McpServer, context: McpContext) {
  server.registerTool(
    'send_asset',
    {
      description:
        'Proposes sending BTC, STX or a SIP-10 token from the paired account. Returns an approval link at once; nothing moves until the user approves in Leather. Stacks sends accept a BNS name as recipient.',
      inputSchema: {
        asset: z.string().describe(assetIdentifierDescription),
        recipient: z
          .string()
          .min(1)
          .describe('Bitcoin address for BTC; Stacks address or BNS name for STX and tokens'),
        amount: decimalAmountSchema,
        memo: z.string().max(maxMemoLength).optional().describe('Memo for STX sends only'),
      },
    },
    ({ asset: assetIdentifier, recipient, amount, memo }) =>
      runTool(async () => {
        const { addresses } = requirePairing(context);
        const asset = await resolveSendAsset(assetIdentifier);
        const money = parseAmount(amount, asset);
        const { amount: displayAmount, symbol } = formatMoney(money);

        if (asset.protocol === 'nativeBtc') {
          requireAddress(addresses.bitcoinPayment, 'Bitcoin');
          if (memo)
            throw toInvalidInput(new Error('BTC sends do not support a memo.'), 'Drop the memo.');
          const address = validateBitcoinRecipient(recipient.trim());
          return createRequestResult(context, {
            requestClass: 'transaction',
            chain: 'bitcoin',
            rpcMethod: 'sendTransfer',
            rpcParams: {
              recipients: [{ address, amount: money.amount.toFixed() }],
              network: MAINNET,
            },
            summary: `Send ${displayAmount} ${symbol} to ${address}.`,
          });
        }

        const stxAddress = requireAddress(addresses.stacks, 'Stacks');
        const resolvedRecipient = await resolveStacksRecipient(recipient);
        const recipientLabel = resolvedRecipient.name
          ? `${resolvedRecipient.name} (${resolvedRecipient.address})`
          : resolvedRecipient.address;

        if (asset.protocol === 'nativeStx') {
          return createRequestResult(context, {
            requestClass: 'transaction',
            chain: 'stacks',
            rpcMethod: 'stx_transferStx',
            rpcParams: {
              recipient: resolvedRecipient.address,
              amount: money.amount.toFixed(),
              memo,
              address: stxAddress,
              network: MAINNET,
            },
            summary: `Send ${displayAmount} STX to ${recipientLabel}.`,
          });
        }

        if (!asset.canTransfer) {
          throw new McpToolError(
            'UNSUPPORTED',
            `${asset.symbol} cannot be transferred.`,
            'Tell the user this token does not support transfers.'
          );
        }
        if (memo) {
          throw toInvalidInput(new Error('Token sends do not support a memo.'), 'Drop the memo.');
        }
        return createRequestResult(context, {
          requestClass: 'transaction',
          chain: 'stacks',
          rpcMethod: 'stx_transferSip10Ft',
          rpcParams: {
            recipient: resolvedRecipient.address,
            asset: asset.assetId,
            amount: money.amount.toFixed(),
            address: stxAddress,
            network: MAINNET,
          },
          summary: `Send ${displayAmount} ${asset.symbol} (${asset.contractId}) to ${recipientLabel}.`,
        });
      })
  );

  server.registerTool(
    'call_contract',
    {
      description:
        'Proposes a Stacks contract call from the paired account. Arguments are typed Clarity JSON, for example { "type": "uint", "value": "1000" }. Post-condition mode defaults to deny, so list every asset the call may move in postConditions. Returns an approval link at once; nothing happens until the user approves in Leather.',
      inputSchema: {
        contract: z
          .string()
          .regex(contractIdRegex, 'Expected <contract address>.<contract name>')
          .describe(
            'Contract id, for example SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-swap-v2-1'
          ),
        functionName: z.string().min(1),
        functionArgs: z.array(clarityJsonSchema).optional(),
        postConditions: z
          .array(postConditionJsonSchema)
          .optional()
          .describe(
            'Post-conditions; address is the principal that sends the asset, usually the paired Stacks address. Amounts are in the smallest unit.'
          ),
        postConditionMode: z.enum(['deny', 'allow']).optional(),
      },
    },
    ({
      contract,
      functionName,
      functionArgs = [],
      postConditions = [],
      postConditionMode = 'deny',
    }) =>
      runTool(() => {
        const { addresses } = requirePairing(context);
        const stxAddress = requireAddress(addresses.stacks, 'Stacks');
        const instructions = 'Fix the argument or post-condition and try again.';

        const encodedArgs = functionArgs.map(arg => {
          try {
            return clarityJsonToHex(arg);
          } catch (error) {
            throw toInvalidInput(error, instructions);
          }
        });
        const encodedPostConditions = postConditions.map(postCondition => {
          try {
            return postConditionJsonToHex(postCondition);
          } catch (error) {
            throw toInvalidInput(error, instructions);
          }
        });

        return createRequestResult(context, {
          requestClass: 'transaction',
          chain: 'stacks',
          rpcMethod: 'stx_callContract',
          rpcParams: {
            contract,
            functionName,
            functionArgs: encodedArgs,
            postConditions: encodedPostConditions,
            postConditionMode,
            address: stxAddress,
            network: MAINNET,
          },
          summary: `Call ${functionName} on ${contract} with ${encodedArgs.length} argument(s), post-condition mode ${postConditionMode} and ${encodedPostConditions.length} post-condition(s).`,
        });
      })
  );
}
