import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../constants';
import { registerAccountTools } from '../tools/account-tools';
import { registerConnectionTools } from '../tools/connection-tools';
import { registerMarketTools } from '../tools/market-tools';
import { registerProposeTools } from '../tools/propose-tools';
import { registerRequestTools } from '../tools/request-tools';
import { registerSwapTools } from '../tools/swap-tools';
import type { McpContext } from './mcp-context';

const serverInstructions = `Leather MCP lets you read the user's paired Leather wallet on mainnet and propose transactions.
You never hold keys and nothing moves without the user: every propose tool returns a link that the user opens to approve the request in the Leather browser extension.
Start with get_wallet_status. If no wallet is paired, call connect_wallet. Follow the instructions field of each tool result.`;

export function createMcpServer(context: McpContext) {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { instructions: serverInstructions }
  );
  registerConnectionTools(server, context);
  registerAccountTools(server, context);
  registerMarketTools(server);
  registerSwapTools(server, context);
  registerProposeTools(server, context);
  registerRequestTools(server, context);
  return server;
}
