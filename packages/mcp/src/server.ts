import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { LEATHER_MCP_NAME, LEATHER_MCP_VERSION } from './constants';
import { type McpContext } from './context';
import { registerConnectionTools } from './tools/connection-tools';
import { registerProposeTools } from './tools/propose-tools';
import { registerReadTools } from './tools/read-tools';
import { registerRequestTools } from './tools/request-tools';
import { registerSwapTools } from './tools/swap-tools';

const serverInstructions =
  'Leather MCP connects you to the user’s Leather wallet on mainnet. It never holds keys or signs: propose tools return a link, and the user reviews and approves every transaction in the Leather extension. Start with get_wallet_status, pair with connect_wallet when needed, and follow the instructions field of each result.';

export function createLeatherMcpServer(context: McpContext) {
  const server = new McpServer(
    { name: LEATHER_MCP_NAME, version: LEATHER_MCP_VERSION },
    { instructions: serverInstructions }
  );
  registerConnectionTools(server, context);
  registerReadTools(server, context);
  registerSwapTools(server, context);
  registerProposeTools(server, context);
  registerRequestTools(server, context);
  return server;
}
