import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useClipboard } from './use-clipboard.web';

function mockClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(writeText) },
  });
}

function removeClipboard() {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
}

function deferred() {
  const resolvers: (() => void)[] = [];
  const promise = new Promise<void>(resolve => resolvers.push(resolve));
  return {
    promise,
    resolve() {
      resolvers.forEach(resolve => resolve());
    },
  };
}

describe('useClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    removeClipboard();
  });

  it('reports copied only after the write resolves', async () => {
    const write = deferred();
    mockClipboard(() => write.promise);
    const { result } = renderHook(() => useClipboard('bc1q-address'));

    let copy: Promise<boolean | undefined> = Promise.resolve(undefined);
    act(() => {
      copy = result.current.onCopy();
    });
    expect(result.current.hasCopied).toBe(false);

    await act(async () => {
      write.resolve();
      await copy;
    });

    await expect(copy).resolves.toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('bc1q-address');
    expect(result.current.hasCopied).toBe(true);
    expect(result.current.hasCopyFailed).toBe(false);
  });

  it('clears the copied state after 1250ms', async () => {
    mockClipboard(() => Promise.resolve());
    const { result } = renderHook(() => useClipboard('value'));

    await act(async () => {
      await result.current.onCopy();
    });
    expect(result.current.hasCopied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1249);
    });
    expect(result.current.hasCopied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.hasCopied).toBe(false);
  });

  it('reports a failure when the write rejects', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    const { result } = renderHook(() => useClipboard('value'));

    let hasSucceeded: boolean | undefined;
    await act(async () => {
      hasSucceeded = await result.current.onCopy();
    });

    expect(hasSucceeded).toBe(false);
    expect(result.current.hasCopied).toBe(false);
    expect(result.current.hasCopyFailed).toBe(true);
  });

  it('reports a failure when the clipboard is unavailable', async () => {
    removeClipboard();
    const { result } = renderHook(() => useClipboard('value'));

    let hasSucceeded: boolean | undefined;
    await act(async () => {
      hasSucceeded = await result.current.onCopy();
    });

    expect(hasSucceeded).toBe(false);
    expect(result.current.hasCopyFailed).toBe(true);
  });

  it('drops a result that a newer copy has superseded', async () => {
    const firstWrite = deferred();
    const writes = [() => firstWrite.promise, () => Promise.reject(new Error('denied'))];
    mockClipboard(() => writes.shift()?.() ?? Promise.resolve());
    const { result } = renderHook(() => useClipboard('value'));

    let first: Promise<boolean | undefined> = Promise.resolve(undefined);
    let second: Promise<boolean | undefined> = Promise.resolve(undefined);
    await act(async () => {
      first = result.current.onCopy();
      second = result.current.onCopy();
      await second;
    });
    await act(async () => {
      firstWrite.resolve();
      await first;
    });

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBe(false);
    expect(result.current.hasCopied).toBe(false);
    expect(result.current.hasCopyFailed).toBe(true);
  });

  it('drops a result that arrives after unmount', async () => {
    const write = deferred();
    mockClipboard(() => write.promise);
    const { result, unmount } = renderHook(() => useClipboard('value'));

    let copy: Promise<boolean | undefined> = Promise.resolve(undefined);
    act(() => {
      copy = result.current.onCopy();
    });
    unmount();
    write.resolve();

    await expect(copy).resolves.toBeUndefined();
  });
});
