import { afterEach, describe, expect, test, vi } from 'vitest';

import { withWalletWriteLock } from './wallet-write-lock';

function createFakeLocks() {
  let held: Promise<void> = Promise.resolve();
  const request = vi.fn(
    async (_name: string, _options: unknown, callback: () => Promise<unknown>) => {
      const previous = held;
      let release: () => void = noop;
      held = new Promise<void>(resolve => {
        release = resolve;
      });
      await previous;
      try {
        return await callback();
      } finally {
        release();
      }
    }
  );
  return { request };
}

function noop() {
  return undefined;
}

describe(withWalletWriteLock.name, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('requests the shared wallet authentication lock exclusively', async () => {
    const locks = createFakeLocks();
    vi.stubGlobal('navigator', { locks });

    await expect(withWalletWriteLock(() => Promise.resolve('done'))).resolves.toBe('done');
    expect(locks.request).toHaveBeenCalledWith(
      'leather:wallet-authentication-write',
      { mode: 'exclusive' },
      expect.any(Function)
    );
  });

  test('runs writes one after another', async () => {
    vi.stubGlobal('navigator', { locks: createFakeLocks() });
    const events: string[] = [];
    let releaseFirst: () => void = noop;
    const firstStarted = Promise.withResolvers<void>();

    const first = withWalletWriteLock(async () => {
      events.push('first:start');
      firstStarted.resolve();
      await new Promise<void>(resolve => {
        releaseFirst = resolve;
      });
      events.push('first:end');
    });
    const second = withWalletWriteLock(() => {
      events.push('second:start');
      return Promise.resolve();
    });

    await firstStarted.promise;
    releaseFirst();
    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  test('fails closed when locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const write = vi.fn(() => Promise.resolve());
    await expect(withWalletWriteLock(write)).rejects.toThrow();
    expect(write).not.toHaveBeenCalled();
  });
});
