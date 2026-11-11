import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { AccountAddresses, FungibleCryptoAsset } from '@leather.io/models';
import { clarityValueSchema } from '@leather.io/rpc';
import { getBnsService } from '@leather.io/services';

import { MCP_NETWORK } from '../constants';
import type { McpContext } from '../server/mcp-context';
import { formatFractionalAmount, parseDecimalAmount } from './amounts';
import { assetReferenceDescription, resolveFungibleAsset } from './asset-reference';
import { proposeRequest } from './propose-request';
import { notPairedError, readPairedAccount } from './require-pairing';
import {
  isMainnetContractId,
  isMainnetStacksAddress,
  postConditionSchema,
  serializeClarityValues,
  serializePostConditions,
} from './stacks-contract-call';
import { readErrorMessage, toolError } from './tool-result';

const bitcoinMainnetAddressPattern = /^(bc1[a-z0-9]{8,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

const approvalInstructions =
  'Nothing has moved. Give the user the approvalUrl to review and approve the transaction in Leather.';

function readBitcoinSenderAddress(account: AccountAddresses) {
  if (account.bitcoin?.type === 'fixedAddress') return account.bitcoin.address;
  return account.bitcoin?.zeroIndexNativeSegwitPayerAddress;
}

async function resolveStacksRecipient(recipient: string) {
  if (isMainnetStacksAddress(recipient)) return { address: recipient };
  if (!recipient.includes('.')) return undefined;
  const bnsName = await getBnsService().getBnsName(recipient.toLowerCase());
  return bnsName ? { address: bnsName.owner, name: bnsName.fullName } : undefined;
}

function getAffectedAssetReference(asset: FungibleCryptoAsset) {
  return asset.protocol === 'sip10' ? asset.assetId : asset.symbol;
}

interface SendAssetInput {
  asset: FungibleCryptoAsset;
  account: AccountAddresses;
  recipient: string;
  amount: string;
  memo?: string;
}

function proposeBitcoinSend(
  context: McpContext,
  { asset, account, recipient, amount, memo }: SendAssetInput
) {
  if (!account.bitcoin) {
    return toolError(
      'UNSUPPORTED',
      'The paired account has no Bitcoin address.',
      'Ask the user to pair an account that has Bitcoin.'
    );
  }
  if (memo) {
    return toolError('INVALID_INPUT', 'Bitcoin sends do not support a memo.', 'Remove the memo.');
  }
  if (!bitcoinMainnetAddressPattern.test(recipient)) {
    return toolError(
      'INVALID_INPUT',
      `${recipient} is not a Bitcoin mainnet address.`,
      'BNS names only resolve for Stacks sends. Ask the user for a Bitcoin mainnet address.'
    );
  }
  const sats = parseDecimalAmount(amount, asset.decimals);
  if (!sats) {
    return toolError(
      'INVALID_INPUT',
      `Invalid amount ${amount}.`,
      `Pass a positive BTC amount with at most ${asset.decimals} decimal places.`
    );
  }
  const sender = readBitcoinSenderAddress(account);
  return proposeRequest(
    context,
    {
      requestClass: 'transaction',
      kind: 'send_asset',
      rpcMethod: 'sendTransfer',
      rpcParams: {
        recipients: [{ address: recipient, amount: sats.toFixed() }],
        network: MCP_NETWORK,
      },
      title: `Send ${formatFractionalAmount(sats, asset.decimals)} BTC`,
      summary: [
        `Amount: ${formatFractionalAmount(sats, asset.decimals)} BTC`,
        `To: ${recipient}`,
        ...(sender ? [`From: ${sender}`] : []),
        'Network: Bitcoin mainnet. You choose the fee in Leather.',
      ],
      chain: 'bitcoin',
      affectedAssets: ['BTC'],
    },
    approvalInstructions
  );
}

async function proposeStacksSend(
  context: McpContext,
  { asset, account, recipient, amount, memo }: SendAssetInput
) {
  if (!account.stacks) {
    return toolError(
      'UNSUPPORTED',
      'The paired account has no Stacks address.',
      'Ask the user to pair an account that has Stacks.'
    );
  }
  const resolvedRecipient = await resolveStacksRecipient(recipient);
  if (!resolvedRecipient) {
    return toolError(
      'INVALID_INPUT',
      `${recipient} is not a Stacks mainnet address or a registered BNS name.`,
      'Ask the user for a Stacks mainnet address (SP…) or a full BNS name such as name.btc.'
    );
  }
  const fractionalAmount = parseDecimalAmount(amount, asset.decimals);
  if (!fractionalAmount) {
    return toolError(
      'INVALID_INPUT',
      `Invalid amount ${amount}.`,
      `Pass a positive ${asset.symbol} amount with at most ${asset.decimals} decimal places.`
    );
  }
  if (asset.protocol === 'sip10' && memo) {
    return toolError('INVALID_INPUT', 'Token sends do not support a memo.', 'Remove the memo.');
  }
  if (asset.protocol === 'sip10' && !asset.canTransfer) {
    return toolError(
      'UNSUPPORTED',
      `${asset.symbol} cannot be transferred.`,
      'Tell the user this token is not transferable.'
    );
  }

  const recipientLabel = resolvedRecipient.name
    ? `${resolvedRecipient.name} (${resolvedRecipient.address})`
    : resolvedRecipient.address;
  const displayAmount = `${formatFractionalAmount(fractionalAmount, asset.decimals)} ${asset.symbol}`;
  const rpc =
    asset.protocol === 'sip10'
      ? {
          rpcMethod: 'stx_transferSip10Ft',
          rpcParams: {
            recipient: resolvedRecipient.address,
            asset: asset.assetId,
            amount: fractionalAmount.toFixed(),
            network: MCP_NETWORK,
          },
        }
      : {
          rpcMethod: 'stx_transferStx',
          rpcParams: {
            recipient: resolvedRecipient.address,
            amount: fractionalAmount.toFixed(),
            ...(memo ? { memo } : {}),
            network: MCP_NETWORK,
          },
        };

  return proposeRequest(
    context,
    {
      requestClass: 'transaction',
      kind: 'send_asset',
      ...rpc,
      title: `Send ${displayAmount}`,
      summary: [
        `Amount: ${displayAmount}`,
        `To: ${recipientLabel}`,
        `From: ${account.stacks.stxAddress}`,
        ...(memo ? [`Memo: ${memo}`] : []),
        'Network: Stacks mainnet. You choose the fee in Leather.',
      ],
      chain: 'stacks',
      affectedAssets: [...new Set(['STX', getAffectedAssetReference(asset)])],
    },
    `${approvalInstructions}${resolvedRecipient.name ? ` ${resolvedRecipient.name} resolved to ${resolvedRecipient.address}; tell the user.` : ''}`
  );
}

export function registerProposeTools(server: McpServer, context: McpContext) {
  server.registerTool(
    'send_asset',
    {
      description:
        'Proposes sending BTC, STX or a SIP-10 token from the paired account. Returns an approval link at once; nothing moves until the user approves it in Leather. Stacks sends accept a BNS name as recipient.',
      inputSchema: {
        asset: z.string().min(1).describe(assetReferenceDescription),
        recipient: z
          .string()
          .min(1)
          .describe('Bitcoin or Stacks mainnet address, or a BNS name for Stacks sends'),
        amount: z.string().min(1).describe('Amount in whole units, for example 0.0015'),
        memo: z.string().max(34).optional().describe('STX sends only'),
      },
    },
    async ({ asset: assetReference, recipient, amount, memo }) => {
      const account = readPairedAccount(context);
      if (!account) return notPairedError();
      try {
        const asset = await resolveFungibleAsset(assetReference);
        if (!asset) {
          return toolError(
            'ASSET_NOT_FOUND',
            `Unknown asset: ${assetReference}`,
            'Call list_assets or get_balances to find the asset id.'
          );
        }
        const input = { asset, account, recipient: recipient.trim(), amount, memo };
        return asset.chain === 'bitcoin'
          ? proposeBitcoinSend(context, input)
          : await proposeStacksSend(context, input);
      } catch (error) {
        return toolError(
          'UPSTREAM_ERROR',
          readErrorMessage(error),
          'Tell the user the transfer could not be prepared and try again later.'
        );
      }
    }
  );

  server.registerTool(
    'call_contract',
    {
      description:
        'Proposes a Stacks mainnet contract call from the paired account. functionArgs are typed Clarity JSON values, for example { "type": "uint", "value": "100" } or { "type": "address", "value": "SP…" }. Returns an approval link at once; nothing happens until the user approves it in Leather.',
      inputSchema: {
        contract: z.string().min(1).describe('Contract id, ADDRESS.contract-name'),
        functionName: z.string().min(1),
        functionArgs: z.array(clarityValueSchema).optional(),
        postConditions: z
          .array(postConditionSchema)
          .optional()
          .describe(
            'Post-conditions, for example { "type": "stx-postcondition", "address": "SP…", "condition": "lte", "amount": "1000000" }'
          ),
        postConditionMode: z
          .enum(['deny', 'allow'])
          .optional()
          .describe(
            'Defaults to deny: the call fails if it moves assets the post-conditions do not cover'
          ),
      },
    },
    ({ contract, functionName, functionArgs, postConditions, postConditionMode }) => {
      const account = readPairedAccount(context);
      if (!account) return notPairedError();
      if (!account.stacks) {
        return toolError(
          'UNSUPPORTED',
          'The paired account has no Stacks address.',
          'Ask the user to pair an account that has Stacks.'
        );
      }
      if (!isMainnetContractId(contract)) {
        return toolError(
          'INVALID_INPUT',
          `${contract} is not a Stacks mainnet contract id.`,
          'Use the form SP….contract-name.'
        );
      }
      const mode = postConditionMode ?? 'deny';
      const fungibleAssets = (postConditions ?? []).flatMap(postCondition =>
        postCondition.type === 'ft-postcondition' ? [postCondition.asset] : []
      );

      return proposeRequest(
        context,
        {
          requestClass: 'transaction',
          kind: 'call_contract',
          rpcMethod: 'stx_callContract',
          rpcParams: {
            contract,
            functionName,
            functionArgs: serializeClarityValues(functionArgs ?? []),
            postConditions: serializePostConditions(postConditions ?? []),
            postConditionMode: mode,
            network: MCP_NETWORK,
          },
          title: `Call ${functionName} on ${contract}`,
          summary: [
            `Contract: ${contract}`,
            `Function: ${functionName}`,
            `Arguments: ${functionArgs?.length ?? 0}`,
            `Post-conditions: ${postConditions?.length ?? 0} (${mode} mode)`,
            ...(mode === 'allow'
              ? ['Allow mode lets this call move assets that no post-condition covers.']
              : []),
            `From: ${account.stacks.stxAddress}`,
          ],
          chain: 'stacks',
          affectedAssets: [...new Set(['STX', ...fungibleAssets])],
        },
        `${approvalInstructions} Explain to the user what the call does before they approve it.`
      );
    }
  );
}
