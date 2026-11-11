import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { MCP_NETWORK } from '../constants';
import type { McpContext } from '../server/mcp-context';
import { createPairingCode } from './pairing-code';
import { proposeRequest } from './propose-request';
import { describeRequest } from './request-description';
import { toolResult } from './tool-result';

export function registerConnectionTools(server: McpServer, context: McpContext) {
  const { pairingStore, requestStore, baseUrl } = context;

  server.registerTool(
    'get_wallet_status',
    {
      description:
        'Shows whether a Leather account is paired with this server, its addresses, and any request still waiting for the user. Call this first.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => {
      const pairing = pairingStore.get();
      const inFlight = [
        requestStore.findInFlight('connect'),
        requestStore.findInFlight('transaction'),
      ].flatMap(request => (request ? [describeRequest(baseUrl, request)] : []));

      if (!pairing) {
        return toolResult(
          { paired: false, network: MCP_NETWORK, ...(inFlight.length ? { inFlight } : {}) },
          'No wallet is paired. Call connect_wallet to pair the user’s Leather account before using any other wallet tool.'
        );
      }
      return toolResult(
        {
          paired: true,
          network: MCP_NETWORK,
          pairedAt: pairing.pairedAt,
          account: pairing.account,
          ...(inFlight.length ? { inFlight } : {}),
        },
        'The wallet is paired. Use the read-only tools to answer questions; propose tools only create approval links and never move funds by themselves.'
      );
    }
  );

  server.registerTool(
    'connect_wallet',
    {
      description:
        'Pairs a Leather account with this server. Returns a connectUrl and a 6-character pairing code to give the user; the user approves the connection in the Leather extension. Set force to re-pair when already paired.',
      inputSchema: {
        force: z.boolean().optional().describe('Re-pair even if an account is already paired'),
      },
    },
    ({ force }) => {
      const pairing = pairingStore.get();
      if (pairing && !force) {
        return toolResult(
          { paired: true, network: MCP_NETWORK, account: pairing.account },
          'An account is already paired. Only call connect_wallet with force: true if the user wants to switch accounts.'
        );
      }
      return proposeRequest(
        context,
        {
          requestClass: 'connect',
          kind: 'connect',
          rpcMethod: 'getAddresses',
          rpcParams: { network: MCP_NETWORK },
          title: 'Connect Leather to your AI agent',
          summary: [
            'Shares the addresses of your active Leather account with the local Leather MCP server.',
            'The agent can read balances and activity and propose transactions; every transaction still needs your approval in Leather.',
          ],
          pairingCode: createPairingCode(),
        },
        'Give the user the connectUrl and the pairingCode, and ask them to open it in the browser where the Leather extension is installed and check the code matches.'
      );
    }
  );

  server.registerTool(
    'disconnect_wallet',
    {
      description:
        'Forgets the paired account and cancels any request still waiting for the user. The Leather extension keeps its own connected-app permission until the user removes it in Leather.',
      inputSchema: {},
      annotations: { destructiveHint: true },
    },
    async () => {
      const cancelled = requestStore.cancelAll();
      await pairingStore.clear();
      return toolResult(
        {
          paired: false,
          network: MCP_NETWORK,
          cancelledRequestIds: cancelled.map(request => request.id),
        },
        'The wallet is disconnected from this server. Tell the user that Leather still lists this site as a connected app until they remove it in Leather’s settings.'
      );
    }
  );
}
