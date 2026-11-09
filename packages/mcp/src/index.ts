import 'reflect-metadata';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import {
  APPROVAL_PORT_ENV_VAR,
  DEFAULT_APPROVAL_PORT,
  LEATHER_MCP_NAME,
  LEATHER_MCP_VERSION,
} from './constants';
import { type McpContext } from './context';
import { createApprovalServer, getBaseUrl, listenApprovalServer } from './http/approval-server';
import { PairingStore } from './pairing/pairing-store';
import { PendingRequestStore } from './requests/pending-request-store';
import { createLeatherMcpServer } from './server';
import { initMcpServices } from './services/init-mcp-services';
import { SwapQuoteCache } from './tools/swap-quote-cache';

const maxPort = 65535;

function writeLog(message: string) {
  process.stderr.write(`${message}\n`);
}

function readPort() {
  const value = process.env[APPROVAL_PORT_ENV_VAR];
  if (!value) return DEFAULT_APPROVAL_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > maxPort) {
    writeLog(`${LEATHER_MCP_NAME}: ${APPROVAL_PORT_ENV_VAR} must be a port number, got ${value}`);
    process.exit(1);
  }
  return port;
}

function isAddressInUseError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'EADDRINUSE';
}

async function main() {
  const port = readPort();
  const baseUrl = getBaseUrl(port);

  initMcpServices();
  const pairingStore = new PairingStore();
  await pairingStore.load();

  const context: McpContext = {
    baseUrl,
    pairingStore,
    requestStore: new PendingRequestStore(),
    swapQuoteCache: new SwapQuoteCache(),
  };

  const approvalServer = createApprovalServer(context, port);
  try {
    await listenApprovalServer(approvalServer, port);
  } catch (error) {
    if (isAddressInUseError(error)) {
      writeLog(
        `${LEATHER_MCP_NAME}: port ${port} is already in use. Set ${APPROVAL_PORT_ENV_VAR} to a free port. A new port changes the approval page address, so you will need to connect the wallet again.`
      );
      process.exit(1);
    }
    throw error;
  }

  const server = createLeatherMcpServer(context);
  const transport = new StdioServerTransport();
  function shutdown() {
    approvalServer.close();
    process.exit(0);
  }
  transport.onclose = shutdown;
  process.stdin.once('end', shutdown);
  await server.connect(transport);
  writeLog(`${LEATHER_MCP_NAME} v${LEATHER_MCP_VERSION} ready, approval pages at ${baseUrl}`);
}

main().catch((error: unknown) => {
  writeLog(`${LEATHER_MCP_NAME}: ${error instanceof Error ? error.message : 'failed to start'}`);
  process.exit(1);
});
