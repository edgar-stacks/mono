import { noop } from '@leather.io/utils';

import { withWalletAuthenticationWriteLock } from './wallet-write-lock';

function createLockManager() {
  const requestedNames: string[] = [];
  let queue = Promise.resolve();
  return {
    requestedNames,
    async request<T>(name: string, callback: () => Promise<T>) {
      requestedNames.push(name);
      const previous = queue;
      let release = noop;
      queue = new Promise<void>(resolve => {
        release = resolve;
      });
      await previous;
      try {
        return await callback();
      } finally {
        release();
      }
    },
  };
}

function createGate() {
  let open = noop;
  const gate = new Promise<void>(resolve => {
    open = resolve;
  });
  return {
    gate,
    open() {
      open();
    },
  };
}

describe(withWalletAuthenticationWriteLock.name, () => {
  test('requests the wallet authentication write lock', async () => {
    const lockManager = createLockManager();

    await expect(
      withWalletAuthenticationWriteLock(() => Promise.resolve('done'), lockManager)
    ).resolves.toBe('done');
    expect(lockManager.requestedNames).toEqual(['leather:wallet-authentication-write']);
  });

  test('serializes overlapping writes', async () => {
    const lockManager = createLockManager();
    const events: string[] = [];
    const firstGate = createGate();

    const first = withWalletAuthenticationWriteLock(async () => {
      events.push('first:start');
      await firstGate.gate;
      events.push('first:end');
    }, lockManager);
    const second = withWalletAuthenticationWriteLock(() => {
      events.push('second:start');
      return Promise.resolve();
    }, lockManager);

    await Promise.resolve();
    firstGate.open();
    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  test('runs directly when no lock manager is available', async () => {
    await expect(
      withWalletAuthenticationWriteLock(() => Promise.resolve(1), undefined)
    ).resolves.toBe(1);
  });
});
