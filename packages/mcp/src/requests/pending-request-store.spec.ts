import { type CreatePendingRequestInput, PendingRequestStore } from './pending-request-store';

const ttlMs = 10 * 60 * 1000;

const sendInput: CreatePendingRequestInput = {
  requestClass: 'transaction',
  kind: 'send_asset',
  rpcMethod: 'stx_transferStx',
  rpcParams: { recipient: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', amount: '1' },
  title: 'Send 0.000001 STX',
  summary: [],
};

const connectInput: CreatePendingRequestInput = {
  requestClass: 'connect',
  kind: 'connect',
  rpcMethod: 'getAddresses',
  rpcParams: {},
  title: 'Connect',
  summary: [],
  pairingCode: 'ABC123',
};

function createRequest(store: PendingRequestStore, input: CreatePendingRequestInput) {
  const created = store.create(input);
  if (!created.ok) throw new Error('Expected the request to be created');
  return created.request;
}

describe(PendingRequestStore.name, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('creates a pending request that expires after the ttl', () => {
    const store = new PendingRequestStore({ ttlMs });
    const request = createRequest(store, sendInput);

    expect(store.get(request.id)?.state).toEqual('pending');
    vi.advanceTimersByTime(ttlMs - 1);
    expect(store.get(request.id)?.state).toEqual('pending');
    vi.advanceTimersByTime(1);
    expect(store.get(request.id)?.state).toEqual('expired');
  });

  test('allows one non-terminal request per class', () => {
    const store = new PendingRequestStore({ ttlMs });
    const first = createRequest(store, sendInput);

    const second = store.create({ ...sendInput, kind: 'swap' });
    expect(second).toMatchObject({ ok: false, code: 'REQUEST_IN_FLIGHT' });
    if (!second.ok) expect(second.inFlight.id).toEqual(first.id);

    expect(store.create(connectInput).ok).toBe(true);
  });

  test('allows a new request once the in-flight one is terminal', () => {
    const store = new PendingRequestStore({ ttlMs });
    const first = createRequest(store, sendInput);
    store.complete(first.id, { state: 'rejected', error: { code: 4001, message: 'Rejected' } });

    expect(store.create(sendInput).ok).toBe(true);
  });

  test('allows a new request once the in-flight one expired', () => {
    const store = new PendingRequestStore({ ttlMs });
    createRequest(store, sendInput);
    vi.advanceTimersByTime(ttlMs);

    expect(store.create(sendInput).ok).toBe(true);
  });

  test('marks a request opened and refuses to reopen a terminal one', () => {
    const store = new PendingRequestStore({ ttlMs });
    const request = createRequest(store, sendInput);

    expect(store.markOpened(request.id)).toMatchObject({ ok: true });
    expect(store.get(request.id)?.state).toEqual('opened');
    store.cancel(request.id);
    expect(store.markOpened(request.id)).toMatchObject({ ok: false, reason: 'terminal' });
    expect(store.markOpened('unknown')).toEqual({ ok: false, reason: 'not-found' });
  });

  test('keeps the first outcome of a request', () => {
    const store = new PendingRequestStore({ ttlMs });
    const request = createRequest(store, sendInput);

    store.complete(request.id, { state: 'approved', result: { txid: '0x01' } });
    const second = store.complete(request.id, {
      state: 'failed',
      error: { message: 'Too late' },
    });

    expect(second).toMatchObject({ ok: false, reason: 'terminal' });
    expect(store.get(request.id)).toMatchObject({ state: 'approved', result: { txid: '0x01' } });
  });

  test('cancels every non-terminal request', () => {
    const store = new PendingRequestStore({ ttlMs });
    const send = createRequest(store, sendInput);
    const connect = createRequest(store, connectInput);

    const cancelled = store.cancelAll();

    expect(cancelled.map(request => request.id).sort()).toEqual([send.id, connect.id].sort());
    expect(store.get(send.id)?.state).toEqual('cancelled');
    expect(store.get(connect.id)?.state).toEqual('cancelled');
  });

  describe('waitForTerminal', () => {
    test('resolves as soon as the request is terminal', async () => {
      const store = new PendingRequestStore({ ttlMs });
      const request = createRequest(store, sendInput);

      const waiting = store.waitForTerminal(request.id, 50_000);
      vi.advanceTimersByTime(1_000);
      store.complete(request.id, { state: 'approved', result: { txid: '0x01' } });

      await expect(waiting).resolves.toMatchObject({ id: request.id, state: 'approved' });
    });

    test('resolves with the current state when the wait times out', async () => {
      const store = new PendingRequestStore({ ttlMs });
      const request = createRequest(store, sendInput);
      store.markOpened(request.id);

      const waiting = store.waitForTerminal(request.id, 5_000);
      vi.advanceTimersByTime(5_000);

      await expect(waiting).resolves.toMatchObject({ id: request.id, state: 'opened' });
    });

    test('resolves when the request expires during the wait', async () => {
      const store = new PendingRequestStore({ ttlMs: 2_000 });
      const request = createRequest(store, sendInput);

      const waiting = store.waitForTerminal(request.id, 50_000);
      vi.advanceTimersByTime(2_000);

      await expect(waiting).resolves.toMatchObject({ id: request.id, state: 'expired' });
    });

    test('resolves at once for terminal and unknown requests', async () => {
      const store = new PendingRequestStore({ ttlMs });
      const request = createRequest(store, sendInput);
      store.cancel(request.id);

      await expect(store.waitForTerminal(request.id, 50_000)).resolves.toMatchObject({
        state: 'cancelled',
      });
      await expect(store.waitForTerminal('unknown', 50_000)).resolves.toBeUndefined();
    });
  });
});
