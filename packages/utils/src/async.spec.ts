import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { delay, ensureAsyncFunctionMinimumDuration, withTimeout } from './async';

function trackSettled<T>(promise: Promise<T>) {
  const state = { settled: false };
  async function markSettled() {
    await Promise.allSettled([promise]);
    state.settled = true;
  }
  void markSettled();
  return state;
}

async function resolveAfter<T>(ms: number, value: T) {
  await delay(ms);
  return value;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe(delay.name, () => {
  test('resolves only after the given duration', async () => {
    const state = trackSettled(delay(200));

    await vi.advanceTimersByTimeAsync(199);
    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(state.settled).toBe(true);
  });
});

describe(ensureAsyncFunctionMinimumDuration.name, () => {
  test('is still pending before the minimum duration when fn resolves at once', async () => {
    const fn = vi.fn((value: string) => Promise.resolve(value));
    const wrapped = ensureAsyncFunctionMinimumDuration(fn, 500);

    const result = wrapped('done');
    const state = trackSettled(result);

    await vi.advanceTimersByTimeAsync(499);
    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(state.settled).toBe(true);
    await expect(result).resolves.toBe('done');
    expect(fn).toHaveBeenCalledWith('done');
  });

  test('resolves when fn takes longer than the minimum duration', async () => {
    const wrapped = ensureAsyncFunctionMinimumDuration(() => resolveAfter(800, 'slow'), 500);

    const result = wrapped();
    const state = trackSettled(result);

    await vi.advanceTimersByTimeAsync(799);
    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('slow');
  });

  test('rejects with the fn error only after the minimum duration', async () => {
    const error = new Error('failed');
    const wrapped = ensureAsyncFunctionMinimumDuration(() => Promise.reject(error), 500);

    const result = wrapped();
    const state = trackSettled(result);

    await vi.advanceTimersByTimeAsync(499);
    expect(state.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).rejects.toBe(error);
  });
});

describe(withTimeout.name, () => {
  test('rejects when the promise is still pending at the timeout', async () => {
    const pending = delay(1000);
    const result = withTimeout(pending, 100);
    const assertion = expect(result).rejects.toThrow('Timed out after 100ms');

    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  test('resolves with the promise value and leaves no pending timer when the promise wins', async () => {
    const result = withTimeout(resolveAfter(50, 'value'), 100);

    await vi.advanceTimersByTimeAsync(50);
    await expect(result).resolves.toBe('value');
    expect(vi.getTimerCount()).toBe(0);
  });

  test('rejects with the promise error and leaves no pending timer when the promise rejects first', async () => {
    const error = new Error('failed');
    const result = withTimeout(Promise.reject(error), 100);

    await expect(result).rejects.toBe(error);
    expect(vi.getTimerCount()).toBe(0);
  });
});
