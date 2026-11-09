import { type CreateRequestInput, PendingRequestStore } from './pending-request-store';

const ttlMs = 10 * 60 * 1000;

function createStore() {
  let id = 0;
  return new PendingRequestStore({ ttlMs, createId: () => `request-${++id}` });
}

const transactionInput: CreateRequestInput = {
  requestClass: 'transaction',
  rpcMethod: 'stx_transferStx',
  rpcParams: { recipient: 'SP000000000000000000002Q6VF78', amount: '1' },
  summary: 'Send 0.000001 STX',
  chain: 'stacks',
};

const connectInput: CreateRequestInput = {
  requestClass: 'connect',
  rpcMethod: 'getAddresses',
  rpcParams: { network: 'mainnet' },
  summary: 'Connect',
  pairingCode: 'ABC234',
};

function createRequest(store: PendingRequestStore, input = transactionInput) {
  const created = store.create(input);
  if (!created.ok) throw new Error('Expected the request to be created');
  return created.request;
}

describe('PendingRequestStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('creates a pending request that expires after the TTL', () => {
    const store = createStore();
    const request = createRequest(store);

    expect(request.state).toBe('pending');
    expect(request.expiresAt - request.createdAt).toBe(ttlMs);
  });

  test('expires a request that is still open after the TTL', () => {
    const store = createStore();
    const request = createRequest(store);

    vi.advanceTimersByTime(ttlMs - 1);
    expect(store.get(request.id)?.state).toBe('pending');

    vi.advanceTimersByTime(1);
    expect(store.get(request.id)?.state).toBe('expired');
  });

  test('keeps a settled request settled after the TTL', () => {
    const store = createStore();
    const request = createRequest(store);
    store.settle(request.id, { state: 'approved', result: { txid: '0x1' } });

    vi.advanceTimersByTime(ttlMs);

    expect(store.get(request.id)?.state).toBe('approved');
  });

  test('allows one open request per class at a time', () => {
    const store = createStore();
    const first = createRequest(store);

    const second = store.create(transactionInput);
    expect(second).toEqual({ ok: false, code: 'REQUEST_IN_FLIGHT', inFlight: first });

    expect(store.create(connectInput).ok).toBe(true);
  });

  test('allows a new request once the open one is terminal or expired', () => {
    const store = createStore();
    const first = createRequest(store);
    store.cancel(first.id);
    const second = createRequest(store);

    vi.advanceTimersByTime(ttlMs);

    expect(store.get(second.id)?.state).toBe('expired');
    expect(store.create(transactionInput).ok).toBe(true);
  });

  test('marks a pending request opened but leaves terminal requests unchanged', () => {
    const store = createStore();
    const request = createRequest(store);

    expect(store.markOpened(request.id)?.state).toBe('opened');

    store.settle(request.id, { state: 'rejected', error: { code: 4001, message: 'Rejected' } });

    expect(store.markOpened(request.id)?.state).toBe('rejected');
  });

  test('does not settle a request twice', () => {
    const store = createStore();
    const request = createRequest(store);
    store.settle(request.id, { state: 'failed', error: { message: 'Failed' } });

    const settled = store.settle(request.id, { state: 'approved', result: {} });

    expect(settled?.state).toBe('failed');
  });

  test('records a late approval of a transaction the user opened before it was cancelled', () => {
    const store = createStore();
    const request = createRequest(store);
    store.markOpened(request.id);
    store.cancel(request.id);

    const settled = store.settle(request.id, { state: 'approved', result: { txid: '0x1' } });

    expect(settled?.state).toBe('approved');
    expect(settled?.result).toEqual({ txid: '0x1' });
  });

  test('records a late approval of a transaction the user opened before it expired', () => {
    const store = createStore();
    const request = createRequest(store);
    store.markOpened(request.id);
    vi.advanceTimersByTime(ttlMs);
    expect(store.get(request.id)?.state).toBe('expired');

    expect(store.settle(request.id, { state: 'approved', result: { txid: '0x1' } })?.state).toBe(
      'approved'
    );
  });

  test('keeps a closed request closed when the late answer is not an approval', () => {
    const store = createStore();
    const request = createRequest(store);
    store.markOpened(request.id);
    store.cancel(request.id);

    const settled = store.settle(request.id, {
      state: 'rejected',
      error: { code: 4001, message: 'Rejected' },
    });

    expect(settled?.state).toBe('cancelled');
  });

  test('ignores a late approval of a request that was never opened or is a connect request', () => {
    const store = createStore();
    const unopened = createRequest(store);
    store.cancel(unopened.id);
    const connect = createRequest(store, connectInput);
    store.markOpened(connect.id);
    store.cancel(connect.id);

    expect(store.settle(unopened.id, { state: 'approved', result: {} })?.state).toBe('cancelled');
    expect(store.settle(connect.id, { state: 'approved', result: {} })?.state).toBe('cancelled');
  });

  test('cancels every open request', () => {
    const store = createStore();
    const transaction = createRequest(store);
    const connect = createRequest(store, connectInput);

    const cancelled = store.cancelAll();

    expect(cancelled.map(request => request.id)).toEqual([transaction.id, connect.id]);
    expect(store.get(transaction.id)?.state).toBe('cancelled');
    expect(store.get(connect.id)?.state).toBe('cancelled');
  });

  describe('waitForTerminal', () => {
    test('resolves as soon as the request is settled', async () => {
      const store = createStore();
      const request = createRequest(store);

      const waiting = store.waitForTerminal(request.id, 50_000);
      vi.advanceTimersByTime(2_000);
      store.settle(request.id, { state: 'approved', result: { txid: '0x1' } });

      const settled = await waiting;
      expect(settled?.state).toBe('approved');
      expect(settled?.result).toEqual({ txid: '0x1' });
    });

    test('returns the open request when the wait times out', async () => {
      const store = createStore();
      const request = createRequest(store);
      store.markOpened(request.id);

      const waiting = store.waitForTerminal(request.id, 5_000);
      await vi.advanceTimersByTimeAsync(5_000);

      expect((await waiting)?.state).toBe('opened');
    });

    test('resolves with expired when the TTL passes during the wait', async () => {
      const store = createStore();
      const request = createRequest(store);
      vi.advanceTimersByTime(ttlMs - 1_000);

      const waiting = store.waitForTerminal(request.id, 50_000);
      await vi.advanceTimersByTimeAsync(1_000);

      expect((await waiting)?.state).toBe('expired');
    });

    test('returns a terminal request immediately', async () => {
      const store = createStore();
      const request = createRequest(store);
      store.cancel(request.id);

      expect((await store.waitForTerminal(request.id, 50_000))?.state).toBe('cancelled');
    });

    test('returns undefined for an unknown request', async () => {
      const store = createStore();

      expect(await store.waitForTerminal('missing', 1_000)).toBeUndefined();
    });
  });
});
