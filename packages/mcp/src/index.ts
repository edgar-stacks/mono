#!/usr/bin/env node
import 'reflect-metadata';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  APPROVAL_PORT_ENV_VAR,
  BRIDGE_SCRIPT_FILE_NAME,
  DEFAULT_APPROVAL_PORT,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  REQUEST_TTL_MS,
  SWAP_QUOTE_TTL_MS,
} from './constants';
import { type ApprovalServer, startApprovalServer } from './http/approval-server';
import { PairingStore } from './pairing/pairing-store';
import { createApprovedOutcomeResolver } from './pairing/resolve-approved-outcome';
import { PendingRequestStore } from './requests/pending-request-store';
import { createMcpServer } from './server/create-mcp-server';
import { initMcpServices } from './services/init-mcp-services';
import { SwapQuoteCache } from './swap/swap-quote-cache';

const maxPort = 65535;

function log(message: string) {
  process.stderr.write(`${message}\n`);
}

function readPort() {
  const value = process.env[APPROVAL_PORT_ENV_VAR];
  if (!value) return DEFAULT_APPROVAL_PORT;
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= maxPort ? port : undefined;
}

function isAddressInUseError(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'EADDRINUSE';
}

async function readBridgeScript() {
  return readFile(fileURLToPath(new URL(`./${BRIDGE_SCRIPT_FILE_NAME}`, import.meta.url)), 'utf-8');
}

async function startApprovalPages(
  port: number,
  requestStore: PendingRequestStore,
  pairingStore: PairingStore
): Promise<ApprovalServer> {
  try {
    return await startApprovalServer({
      port,
      store: requestStore,
      readBridgeScript,
      resolveApprovedOutcome: createApprovedOutcomeResolver(pairingStore),
    });
  } catch (error) {
    if (isAddressInUseError(error)) {
      log(
        `${MCP_SERVER_NAME}: port ${port} is already in use. Set ${APPROVAL_PORT_ENV_VAR} to a free port. A new port means re-connecting the wallet with connect_wallet.`
      );
      process.exit(1);
    }
    throw error;
  }
}

async function main() {
  const port = readPort();
  if (!port) {
    log(
      `${MCP_SERVER_NAME}: ${APPROVAL_PORT_ENV_VAR} must be a port number between 1 and ${maxPort}.`
    );
    process.exit(1);
  }

  initMcpServices();
  const pairingStore = new PairingStore();
  await pairingStore.load();
  const requestStore = new PendingRequestStore({ ttlMs: REQUEST_TTL_MS });
  const approvalServer = await startApprovalPages(port, requestStore, pairingStore);

  const server = createMcpServer({
    baseUrl: approvalServer.baseUrl,
    pairingStore,
    requestStore,
    swapQuoteCache: new SwapQuoteCache(SWAP_QUOTE_TTL_MS),
  });

  async function shutdown() {
    requestStore.cancelAll();
    await Promise.allSettled([server.close(), approvalServer.close()]);
    process.exit(0);
  }
  process.stdin.on('end', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await server.connect(new StdioServerTransport());
  log(
    `${MCP_SERVER_NAME} v${MCP_SERVER_VERSION} ready, approval pages at ${approvalServer.baseUrl}`
  );
}

main().catch((error: unknown) => {
  log(
    `${MCP_SERVER_NAME} failed to start: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
