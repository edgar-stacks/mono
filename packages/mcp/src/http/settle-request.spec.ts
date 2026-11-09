import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PairingStore } from '../pairing/pairing-store';
import { PendingRequestStore } from '../requests/pending-request-store';
import { settleRequest } from './settle-request';

function createStores() {
  return {
    requestStore: new PendingRequestStore(),
    pairingStore: new PairingStore(join(tmpdir(), 'leather-mcp-settle-request', 'pairing.json')),
  };
}

describe(settleRequest.name, () => {
  test('keeps the txid of a transaction approved after the request was cancelled', async () => {
    const stores = createStores();
    const created = stores.requestStore.create({
      requestClass: 'transaction',
      rpcMethod: 'sendTransfer',
      rpcParams: {},
      summary: 'Send 0.0001 BTC',
      chain: 'bitcoin',
    });
    if (!created.ok) throw new Error('Expected the request to be created');
    stores.requestStore.markOpened(created.request.id);
    stores.requestStore.cancel(created.request.id);

    const settled = await settleRequest(stores, created.request.id, {
      status: 'approved',
      result: { txid: 'abc' },
    });

    expect(settled?.state).toBe('approved');
    expect(settled?.result).toEqual({ txid: 'abc' });
  });

  test('does not pair from a connect request that was cancelled', async () => {
    const stores = createStores();
    const created = stores.requestStore.create({
      requestClass: 'connect',
      rpcMethod: 'getAddresses',
      rpcParams: {},
      summary: 'Connect',
    });
    if (!created.ok) throw new Error('Expected the request to be created');
    stores.requestStore.markOpened(created.request.id);
    stores.requestStore.cancel(created.request.id);

    const settled = await settleRequest(stores, created.request.id, {
      status: 'approved',
      result: { addresses: [] },
    });

    expect(settled?.state).toBe('cancelled');
    expect(stores.pairingStore.get()).toBeUndefined();
  });
});
