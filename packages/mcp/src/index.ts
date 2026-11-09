#!/usr/bin/env node
import 'reflect-metadata';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

import {
  DEFAULT_PORT,
  LISTEN_HOST,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  PAIRING_DIR_NAME,
  PORT_ENV_VAR,
  REQUEST_TTL_MS,
  SWAP_QUOTE_TTL_MS,
} from './constants';
import { createHttpServer, listen } from './http/http-server';
import { PairingStore } from './pairing/pairing-store';
import { PendingRequestStore } from './requests/pending-request-store';
import { type ServerContext } from './server-context';
import { initServices } from './services/init-services';
import { SwapQuoteCache } from './swap/swap-quote-cache';
import { registerTools } from './tools/register-tools';

const portSchema = z.coerce.number().int().min(1).max(65_535);
const addressInUseSchema = z.object({ code: z.literal('EADDRINUSE') });

function log(message: string) {
  process.stderr.write(`${message}\n`);
}

function exitWithError(message: string): never {
  log(message);
  process.exit(1);
}

function getPort() {
  const value = process.env[PORT_ENV_VAR];
  if (!value) return DEFAULT_PORT;
  const parsed = portSchema.safeParse(value);
  if (!parsed.success) exitWithError(`${PORT_ENV_VAR} must be a port number, got "${value}".`);
  return parsed.data;
}

async function loadBridgeClient() {
  try {
    return await readFile(new URL('./bridge-client.js', import.meta.url), 'utf-8');
  } catch {
    return null;
  }
}

async function main() {
  const port = getPort();
  const baseUrl = `http://${LISTEN_HOST}:${port}`;

  initServices();
  const pairing = new PairingStore(join(homedir(), PAIRING_DIR_NAME));
  await pairing.load();

  const context: ServerContext = {
    baseUrl,
    pairing,
    requests: new PendingRequestStore({ ttlMs: REQUEST_TTL_MS }),
    swapQuotes: new SwapQuoteCache(SWAP_QUOTE_TTL_MS),
  };

  const httpServer = createHttpServer({
    context,
    port,
    bridgeClientSource: await loadBridgeClient(),
  });
  try {
    await listen(httpServer, port);
  } catch (error) {
    if (addressInUseSchema.safeParse(error).success) {
      exitWithError(
        `Port ${port} on ${LISTEN_HOST} is already in use. Set ${PORT_ENV_VAR} to a free port. A new port is a new origin for Leather, so you will need to connect the wallet again.`
      );
    }
    throw error;
  }

  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
  registerTools(server, context);
  await server.connect(new StdioServerTransport());

  async function shutdown() {
    await server.close();
    httpServer.close();
    process.exit(0);
  }
  process.stdin.once('end', () => void shutdown());
  process.stdin.once('close', () => void shutdown());

  log(`${MCP_SERVER_NAME} v${MCP_SERVER_VERSION} ready, approval pages at ${baseUrl}`);
}

main().catch((error: unknown) => {
  exitWithError(
    `${MCP_SERVER_NAME} failed to start: ${error instanceof Error ? error.message : 'unknown error'}`
  );
});
