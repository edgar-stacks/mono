import { PendingRequestStore } from './pending-request-store';
import { presentRequest } from './request-presenter';

const baseUrl = 'http://127.0.0.1:8437';

function createOpenedTransaction() {
  const store = new PendingRequestStore();
  const created = store.create({
    requestClass: 'transaction',
    rpcMethod: 'sendTransfer',
    rpcParams: {},
    summary: 'Send 0.0001 BTC',
    chain: 'bitcoin',
  });
  if (!created.ok) throw new Error('Expected the request to be created');
  return { store, id: created.request.id };
}

describe(presentRequest.name, () => {
  test('warns against proposing again when an opened transaction is cancelled', () => {
    const { store, id } = createOpenedTransaction();
    store.markOpened(id);
    const cancelled = store.cancel(id);
    if (!cancelled) throw new Error('Expected the request');

    const { instructions } = presentRequest(cancelled, baseUrl);

    expect(instructions).not.toContain('nothing was signed');
    expect(instructions).toContain('Do not propose the same transaction again');
  });

  test('says nothing was signed when a transaction is cancelled before it was opened', () => {
    const { store, id } = createOpenedTransaction();
    const cancelled = store.cancel(id);
    if (!cancelled) throw new Error('Expected the request');

    expect(presentRequest(cancelled, baseUrl).instructions).toBe(
      'The request was cancelled and nothing was signed.'
    );
  });

  test('reports the txid of a late approval', () => {
    const { store, id } = createOpenedTransaction();
    store.markOpened(id);
    store.cancel(id);
    const approved = store.settle(id, { state: 'approved', result: { txid: 'abc' } });
    if (!approved) throw new Error('Expected the request');

    const { data } = presentRequest(approved, baseUrl);

    expect(data).toMatchObject({ state: 'approved', txid: 'abc' });
  });
});
