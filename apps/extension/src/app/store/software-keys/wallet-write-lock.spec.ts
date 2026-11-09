import { withWalletAuthenticationWriteLock } from './wallet-write-lock';

afterEach(() => {
  vi.unstubAllGlobals();
});

function createSerialLocks() {
  let queue: Promise<unknown> = Promise.resolve();
  async function request(_name: string, fn: () => Promise<unknown>) {
    const previous = queue;
    const done = Promise.withResolvers<void>();
    queue = done.promise;
    try {
      await previous;
      return await fn();
    } finally {
      done.resolve();
    }
  }
  return { request };
}

describe(withWalletAuthenticationWriteLock.name, () => {
  test('runs the write under the wallet authentication lock', async () => {
    const request = vi.fn((_name: string, fn: () => Promise<string>) => fn());
    vi.stubGlobal('navigator', { locks: { request } });

    await expect(withWalletAuthenticationWriteLock(() => Promise.resolve('done'))).resolves.toBe(
      'done'
    );
    expect(request).toHaveBeenCalledWith(
      'leather:wallet-authentication-write',
      expect.any(Function)
    );
  });

  test('serializes overlapping writes', async () => {
    vi.stubGlobal('navigator', { locks: createSerialLocks() });

    const events: string[] = [];
    const firstGate = Promise.withResolvers<void>();
    const first = withWalletAuthenticationWriteLock(async () => {
      events.push('first:start');
      await firstGate.promise;
      events.push('first:end');
    });
    const second = withWalletAuthenticationWriteLock(() => {
      events.push('second');
      return Promise.resolve();
    });

    await Promise.resolve();
    firstGate.resolve();
    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second']);
  });

  test('propagates a failing write', async () => {
    vi.stubGlobal('navigator', {
      locks: { request: (_name: string, fn: () => Promise<unknown>) => fn() },
    });
    await expect(
      withWalletAuthenticationWriteLock(() => Promise.reject(new Error('stale')))
    ).rejects.toThrow('stale');
  });

  test('runs the write directly where Web Locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});
    await expect(withWalletAuthenticationWriteLock(() => Promise.resolve(1))).resolves.toBe(1);
  });
});
