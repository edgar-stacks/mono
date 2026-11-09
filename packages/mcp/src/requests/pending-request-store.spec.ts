import { type PendingRequestInput, PendingRequestStore } from './pending-request-store';

const ttlMs = 10 * 60 * 1000;

const connectInput: PendingRequestInput = {
  requestClass: 'connect',
  kind: 'connect',
  rpcMethod: 'getAddresses',
  rpcParams: { network: 'mainnet' },
  summary: ['Connect'],
  pairingCode: 'ABC234',
};

const sendInput: PendingRequestInput = {
  requestClass: 'transaction',
  kind: 'send_asset',
  rpcMethod: 'stx_transferStx',
  rpcParams: { recipient: 'SP000000000000000000002Q6VF78', amount: '1' },
  summary: ['Send 0.000001 STX'],
  chain: 'stacks',
};

function createRequest(store: PendingRequestStore, input: PendingRequestInput) {
  const created = store.create(input);
  if (!created.created) throw new Error('Expected the request to be created');
  return created.request;
}

describe(PendingRequestStore.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('creates a pending request that expires after the TTL', () => {
    const store = new PendingRequestStore({ ttlMs });
    const request = createRequest(store, connectInput);
    expect(request.status).toBe('pending');
    expect(request.expiresAt - request.createdAt).toBe(ttlMs);

    vi.advanceTimersByTime(ttlMs - 1);
    expect(store.get(request.id)?.status).toBe('pending');

    vi.advanceTimersByTime(1);
    expect(store.get(request.id)?.status).toBe('expired');
  });

  test('does not expire a request that already finished', () => {
    const store = new PendingRequestStore({ ttlMs });
    const request = createRequest(store, sendInput);
    store.complete(request.id, { status: 'approved', result: { txid: '0x1' } });

    vi.advanceTimersByTime(ttlMs);
    expect(store.get(request.id)?.status).toBe('approved');
  });

  test('allows one in-flight request per class', () => {
    const store = new PendingRequestStore({ ttlMs });
    const first = createRequest(store, sendInput);

    const second = store.create(sendInput);
    expect(second).toEqual({ created: false, code: 'REQUEST_IN_FLIGHT', inFlight: first });

    expect(store.create(connectInput).created).toBe(true);
  });

  test('accepts a new request once the in-flight one ends', () => {
    const store = new PendingRequestStore({ ttlMs });
    const first = createRequest(store, sendInput);
    store.markOpened(first.id);
    expect(store.create(sendInput).created).toBe(false);

    store.complete(first.id, { status: 'rejected', error: 'User rejected' });
    expect(store.create(sendInput).created).toBe(true);
  });

  test('frees the class slot when the in-flight request expires', () => {
    const store = new PendingRequestStore({ ttlMs });
    createRequest(store, sendInput);
    vi.advanceTimersByTime(ttlMs);
    expect(store.create(sendInput).created).toBe(true);
  });

  test('marks only pending requests as opened', () => {
    const store = new PendingRequestStore({ ttlMs });
    const request = createRequest(store, sendInput);
    expect(store.markOpened(request.id)?.status).toBe('opened');

    store.cancel(request.id);
    expect(store.markOpened(request.id)?.status).toBe('cancelled');
  });

  test('does not change a request once it is terminal', () => {
    const store = new PendingRequestStore({ ttlMs });
    const request = createRequest(store, sendInput);
    store.cancel(request.id);

    expect(store.complete(request.id, { status: 'approved', result: {} })).toBeUndefined();
    expect(store.cancel(request.id)).toBeUndefined();
    expect(store.get(request.id)?.status).toBe('cancelled');
  });

  test('cancels every in-flight request', () => {
    const store = new PendingRequestStore({ ttlMs });
    const connect = createRequest(store, connectInput);
    const send = createRequest(store, sendInput);

    expect(store.cancelAll().map(request => request.id)).toEqual([connect.id, send.id]);
    expect(store.listInFlight()).toEqual([]);
  });

  describe('waitForTerminal', () => {
    test('resolves as soon as the request finishes', async () => {
      const store = new PendingRequestStore({ ttlMs });
      const request = createRequest(store, sendInput);
      const waiting = store.waitForTerminal(request.id, 50_000);

      vi.advanceTimersByTime(1_000);
      store.complete(request.id, { status: 'approved', result: { txid: '0x1' } });

      await expect(waiting).resolves.toMatchObject({ status: 'approved' });
    });

    test('resolves with the current state when the wait times out', async () => {
      const store = new PendingRequestStore({ ttlMs });
      const request = createRequest(store, sendInput);
      store.markOpened(request.id);
      const waiting = store.waitForTerminal(request.id, 5_000);

      vi.advanceTimersByTime(5_000);

      await expect(waiting).resolves.toMatchObject({ status: 'opened' });
    });

    test('resolves as expired when the TTL runs out during the wait', async () => {
      const store = new PendingRequestStore({ ttlMs: 2_000 });
      const request = createRequest(store, sendInput);
      const waiting = store.waitForTerminal(request.id, 50_000);

      vi.advanceTimersByTime(2_000);

      await expect(waiting).resolves.toMatchObject({ status: 'expired' });
    });

    test('returns a terminal request without waiting', async () => {
      const store = new PendingRequestStore({ ttlMs });
      const request = createRequest(store, sendInput);
      store.cancel(request.id);

      await expect(store.waitForTerminal(request.id, 50_000)).resolves.toMatchObject({
        status: 'cancelled',
      });
    });

    test('returns undefined for an unknown request', async () => {
      const store = new PendingRequestStore({ ttlMs });
      await expect(store.waitForTerminal('unknown', 50_000)).resolves.toBeUndefined();
    });
  });
});
