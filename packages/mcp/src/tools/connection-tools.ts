import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { randomInt } from 'node:crypto';
import { z } from 'zod';

import { MAINNET, PAIRING_CODE_ALPHABET, PAIRING_CODE_LENGTH } from '../constants';
import { type McpContext } from '../context';
import { createRequestResult } from './create-request';
import { runTool, toolResult } from './tool-result';

function createPairingCode() {
  return Array.from(
    { length: PAIRING_CODE_LENGTH },
    () => PAIRING_CODE_ALPHABET[randomInt(PAIRING_CODE_ALPHABET.length)]
  ).join('');
}

export function registerConnectionTools(server: McpServer, context: McpContext) {
  const { pairingStore, requestStore } = context;

  server.registerTool(
    'get_wallet_status',
    {
      description:
        'Shows whether a Leather account is paired with this server, its mainnet addresses and any open approval requests. Call this first.',
      annotations: { readOnlyHint: true },
    },
    () =>
      runTool(() => {
        const pairing = pairingStore.get();
        if (!pairing) {
          return toolResult(
            { paired: false, network: MAINNET },
            'No account is paired. Call connect_wallet to pair a Leather account before reading balances or proposing transactions.'
          );
        }
        const openRequests = requestStore
          .list()
          .filter(request => request.state === 'pending' || request.state === 'opened')
          .map(request => ({
            requestId: request.id,
            type: request.requestClass,
            state: request.state,
          }));
        return toolResult(
          {
            paired: true,
            network: MAINNET,
            addresses: pairing.addresses,
            pairedAt: pairing.pairedAt,
            openRequests,
          },
          'The account is paired. Use the read tools for balances and activity. Propose tools only create an approval link; the user approves every transaction in Leather.'
        );
      })
  );

  server.registerTool(
    'connect_wallet',
    {
      description:
        'Pairs a Leather account. Returns a connectUrl the user opens in the browser where Leather is installed, and a 6-character pairingCode the page shows. Set force to pair again when an account is already paired.',
      inputSchema: {
        force: z
          .boolean()
          .optional()
          .describe('Pair again even if an account is already paired, replacing the pairing'),
      },
    },
    ({ force }) =>
      runTool(() => {
        const pairing = pairingStore.get();
        if (pairing && !force) {
          return toolResult(
            { alreadyPaired: true, addresses: pairing.addresses },
            'An account is already paired. Only call connect_wallet with force: true if the user asks to pair a different account.'
          );
        }
        const pairingCode = createPairingCode();
        return createRequestResult(context, {
          requestClass: 'connect',
          rpcMethod: 'getAddresses',
          rpcParams: { network: MAINNET },
          summary: 'Share this Leather account’s mainnet addresses with your local agent.',
          pairingCode,
        });
      })
  );

  server.registerTool(
    'disconnect_wallet',
    {
      description:
        'Removes the pairing from this server and cancels any open requests. The site permission inside Leather stays until the user removes it there.',
      annotations: { destructiveHint: true },
    },
    () =>
      runTool(async () => {
        const cancelled = requestStore.cancelAll();
        await pairingStore.clear();
        return toolResult(
          { paired: false, cancelledRequests: cancelled.map(request => request.id) },
          'The pairing was removed. To remove the connected-site permission too, the user can revoke it in Leather’s settings.'
        );
      })
  );
}
