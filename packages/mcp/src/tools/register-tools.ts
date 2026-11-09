import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { type ServerContext } from '../server-context';
import { registerConnectionTools } from './connection-tools';
import { registerProposeTools } from './propose-tools';
import { registerReadTools } from './read-tools';
import { registerRequestTools } from './request-tools';

export function registerTools(server: McpServer, context: ServerContext) {
  registerConnectionTools(server, context);
  registerReadTools(server, context);
  registerProposeTools(server, context);
  registerRequestTools(server, context);
}
