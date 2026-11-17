import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { delay, ensureAsyncFunctionMinimumDuration, withTimeout } from './async';

function trackSettlement<T>(promise: Promise<T>) {
  const state = { settled: false };
  async function markSettled() {
    await Promise.allSettled([promise]);
    state.settled = true;
  }
  void markSettled();
  return state;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe(delay.name, () => {
  it('resolves only after the given duration', async () => {
    const state = trackSettlement(delay(200));

    await vi.advanceTimersByTimeAsync(199);
    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(state.settled).toBe(true);
  });
});

describe(ensureAsyncFunctionMinimumDuration.name, () => {
  it('stays pending until the minimum duration when fn resolves at once', async () => {
    const fn = vi.fn((value: string) => Promise.resolve(value));
    const wrapped = ensureAsyncFunctionMinimumDuration(fn, 500);

    const result = wrapped('done');
    const state = trackSettlement(result);

    await vi.advanceTimersByTimeAsync(499);
    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(state.settled).toBe(true);
    await expect(result).resolves.toBe('done');
    expect(fn).toHaveBeenCalledWith('done');
  });

  it('resolves when fn takes longer than the minimum duration', async () => {
    const wrapped = ensureAsyncFunctionMinimumDuration(async () => {
      await delay(800);
      return 42;
    }, 500);

    const result = wrapped();
    const state = trackSettlement(result);

    await vi.advanceTimersByTimeAsync(799);
    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe(42);
  });

  it('rejects only after the minimum duration when fn rejects at once', async () => {
    const error = new Error('failed');
    const wrapped = ensureAsyncFunctionMinimumDuration(() => Promise.reject(error), 500);

    const result = wrapped();
    const state = trackSettlement(result);

    await vi.advanceTimersByTimeAsync(499);
    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).rejects.toBe(error);
  });
});

describe(withTimeout.name, () => {
  it('rejects when the promise is still pending at the timeout', async () => {
    const pending = new Promise<never>(() => undefined);
    const result = withTimeout(pending, 100);
    const assertion = expect(result).rejects.toThrow('Timed out after 100ms');

    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it('resolves with the promise value and leaves no pending timer when the promise wins', async () => {
    const result = withTimeout(Promise.resolve('value'), 100);

    await expect(result).resolves.toBe('value');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects with the promise error and leaves no pending timer when the promise rejects first', async () => {
    const error = new Error('failed');
    const result = withTimeout(Promise.reject(error), 100);

    await expect(result).rejects.toBe(error);
    expect(vi.getTimerCount()).toBe(0);
  });
});
