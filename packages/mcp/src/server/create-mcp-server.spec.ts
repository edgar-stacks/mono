import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

import { PairingStore } from '../pairing/pairing-store';
import { PendingRequestStore } from '../requests/pending-request-store';
import { SwapQuoteCache } from '../swap/swap-quote-cache';
import { createMcpServer } from './create-mcp-server';

const expectedTools = [
  'get_wallet_status',
  'connect_wallet',
  'disconnect_wallet',
  'get_balances',
  'list_assets',
  'get_activity',
  'get_transaction_status',
  'get_market_data',
  'get_swap_quotes',
  'resolve_name',
  'get_defi_positions',
  'send_asset',
  'call_contract',
  'swap',
  'check_request',
  'cancel_request',
];

const textContentSchema = z.object({
  content: z.array(z.object({ type: z.literal('text'), text: z.string() })).min(1),
});

const baseUrl = 'http://127.0.0.1:8437';

async function readToolJson(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = textContentSchema.parse(await client.callTool({ name, arguments: args }));
  const [content] = result.content;
  if (!content) throw new Error('Expected text content');
  return z.record(z.string(), z.unknown()).parse(JSON.parse(content.text));
}

describe(createMcpServer.name, () => {
  let pairingDirectory: string;
  let client: Client;
  let requestStore: PendingRequestStore;

  beforeEach(async () => {
    pairingDirectory = await mkdtemp(join(tmpdir(), 'leather-mcp-'));
    requestStore = new PendingRequestStore({ ttlMs: 60_000 });
    const server = createMcpServer({
      baseUrl,
      pairingStore: new PairingStore(pairingDirectory),
      requestStore,
      swapQuoteCache: new SwapQuoteCache(60_000),
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    requestStore.cancelAll();
    await client.close();
    await rm(pairingDirectory, { recursive: true, force: true });
  });

  test('lists all tools', async () => {
    const { tools } = await client.listTools();

    expect(tools.map(tool => tool.name).sort()).toEqual([...expectedTools].sort());
  });

  test('reports an unpaired mainnet wallet before pairing', async () => {
    const status = await readToolJson(client, 'get_wallet_status');

    expect(status).toMatchObject({ paired: false, network: 'mainnet' });
    expect(status.instructions).toEqual(expect.any(String));
  });

  test('returns a connect url and a 6-character pairing code', async () => {
    const connect = await readToolJson(client, 'connect_wallet');

    expect(connect).toMatchObject({ kind: 'connect', state: 'pending' });
    expect(connect.pairingCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(connect.connectUrl).toEqual(`${baseUrl}/connect/${String(connect.requestId)}`);
  });

  test('asks the agent to pair before reading balances', async () => {
    const balances = await readToolJson(client, 'get_balances');

    expect(balances).toMatchObject({ error: { code: 'NOT_PAIRED' } });
  });
});
