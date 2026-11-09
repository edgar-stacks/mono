import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { NETWORK } from '../constants';
import { describeRequest, getRequestUrl } from '../requests/describe-request';
import { generatePairingCode } from '../requests/pairing-code';
import { type ServerContext } from '../server-context';
import { notPairedInstructions, toolError, toolResult } from './tool-result';

function getInFlightRequests(context: ServerContext) {
  return context.requests.listInFlight().map(request => ({
    requestId: request.id,
    kind: request.kind,
    status: request.status,
    url: getRequestUrl(context.baseUrl, request),
  }));
}

export function registerConnectionTools(server: McpServer, context: ServerContext) {
  server.registerTool(
    'get_wallet_status',
    {
      title: 'Get wallet status',
      description:
        'Report whether a Leather account is paired with this server, its addresses, the network and any requests still waiting for the user.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () => {
      const pairing = context.pairing.current;
      if (!pairing) return toolResult({ paired: false, network: NETWORK }, notPairedInstructions);
      return toolResult(
        {
          paired: true,
          network: NETWORK,
          pairedAt: pairing.pairedAt,
          addresses: pairing.addresses,
          inFlightRequests: getInFlightRequests(context),
        },
        'The account is paired. Use the read-only tools to answer questions, and the propose tools to prepare transactions the user approves in Leather.'
      );
    }
  );

  server.registerTool(
    'connect_wallet',
    {
      title: 'Connect wallet',
      description:
        'Start pairing a Leather account. Returns a connectUrl to open in the browser where the Leather extension is installed, and a 6-character pairing code shown on that page. Pass force to re-pair when an account is already paired.',
      inputSchema: {
        force: z
          .boolean()
          .optional()
          .describe('Replace the current pairing, or restart a pairing already in progress'),
      },
    },
    ({ force }) => {
      const pairing = context.pairing.current;
      if (pairing && !force) {
        return toolResult(
          { alreadyPaired: true, network: NETWORK, addresses: pairing.addresses },
          'An account is already paired. Only call connect_wallet with force: true if the user asks to pair a different account.'
        );
      }

      const inFlight = context.requests.findInFlight('connect');
      if (inFlight && force) context.requests.cancel(inFlight.id);
      if (inFlight && !force) {
        return toolError(
          'REQUEST_IN_FLIGHT',
          'A connect request is already waiting for the user.',
          `Ask the user to open ${getRequestUrl(context.baseUrl, inFlight)} and approve it in Leather, then call check_request with requestId ${inFlight.id}. Call connect_wallet with force: true to start over.`
        );
      }

      const pairingCode = generatePairingCode();
      const created = context.requests.create({
        requestClass: 'connect',
        kind: 'connect',
        rpcMethod: 'getAddresses',
        rpcParams: { network: NETWORK, allowPolicyAccounts: false },
        summary: [
          'Your AI agent asks to read the addresses of one Leather account on mainnet.',
          'It can then read balances and propose transactions. Every transaction still needs your approval in Leather.',
          'This server never holds your keys.',
        ],
        pairingCode,
      });
      if (!created.created) {
        return toolError(
          'REQUEST_IN_FLIGHT',
          'A connect request is already waiting for the user.',
          'Call check_request for the request in progress, or connect_wallet with force: true.'
        );
      }

      const { payload } = describeRequest(context.baseUrl, created.request);
      return toolResult(
        { ...payload, connectUrl: payload.url },
        `Ask the user to open connectUrl in the browser where Leather is installed, check that the page shows pairing code ${pairingCode}, and approve the connection in Leather. Then call check_request with requestId and waitSeconds: 50, repeating until the status is no longer pending or opened.`
      );
    }
  );

  server.registerTool(
    'disconnect_wallet',
    {
      title: 'Disconnect wallet',
      description:
        'Forget the paired account and cancel every request still waiting for the user. The permission Leather granted to this server stays until the user removes it in Leather.',
      inputSchema: {},
      annotations: { destructiveHint: true },
    },
    async () => {
      const cancelled = context.requests.cancelAll();
      await context.pairing.clear();
      return toolResult(
        {
          paired: false,
          network: NETWORK,
          cancelledRequestIds: cancelled.map(request => request.id),
        },
        `The pairing is cleared. Tell the user that Leather still lists ${context.baseUrl} as a connected app until they remove it in Leather.`
      );
    }
  );
}
