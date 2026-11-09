import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useClipboard } from './use-clipboard.web';

interface DeferredHandlers {
  resolve?(): void;
  reject?(error: Error): void;
}

function deferred() {
  const handlers: DeferredHandlers = {};
  const promise = new Promise<void>((resolve, reject) => {
    handlers.resolve = resolve;
    handlers.reject = reject;
  });
  return {
    promise,
    resolve() {
      handlers.resolve?.();
    },
    reject(error: Error) {
      handlers.reject?.(error);
    },
  };
}

function mockClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(writeText) },
  });
}

describe('useClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  });

  it('reports copied only after the clipboard write resolves', async () => {
    const write = deferred();
    mockClipboard(() => write.promise);
    const { result } = renderHook(() => useClipboard('bc1q-address'));

    let copyResult: Promise<boolean | undefined> = Promise.resolve(undefined);
    act(() => {
      copyResult = result.current.onCopy();
    });
    expect(result.current.hasCopied).toBe(false);

    await act(async () => {
      write.resolve();
      await expect(copyResult).resolves.toBe(true);
    });
    expect(result.current.hasCopied).toBe(true);
    expect(result.current.hasCopyFailed).toBe(false);
  });

  it('resets copied after 1250ms', async () => {
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

  it('returns false and reports a failure when the write rejects', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    const { result } = renderHook(() => useClipboard('value'));

    let copyResult: boolean | undefined;
    await act(async () => {
      copyResult = await result.current.onCopy();
    });
    expect(copyResult).toBe(false);
    expect(result.current.hasCopied).toBe(false);
    expect(result.current.hasCopyFailed).toBe(true);
  });

  it('returns false when the clipboard is unavailable', async () => {
    const { result } = renderHook(() => useClipboard('value'));

    let copyResult: boolean | undefined;
    await act(async () => {
      copyResult = await result.current.onCopy();
    });
    expect(copyResult).toBe(false);
    expect(result.current.hasCopyFailed).toBe(true);
  });

  it('drops a stale result when a newer copy has started', async () => {
    const first = deferred();
    const second = deferred();
    const writes = [first.promise, second.promise];
    mockClipboard(() => writes.shift() ?? Promise.resolve());
    const { result } = renderHook(() => useClipboard('value'));

    let firstResult: Promise<boolean | undefined> = Promise.resolve(undefined);
    let secondResult: Promise<boolean | undefined> = Promise.resolve(undefined);
    act(() => {
      firstResult = result.current.onCopy();
      secondResult = result.current.onCopy();
    });

    await act(async () => {
      first.reject(new Error('denied'));
      await expect(firstResult).resolves.toBeUndefined();
    });
    expect(result.current.hasCopyFailed).toBe(false);

    await act(async () => {
      second.resolve();
      await expect(secondResult).resolves.toBe(true);
    });
    expect(result.current.hasCopied).toBe(true);
  });

  it('drops the result when the component unmounts before the write resolves', async () => {
    const write = deferred();
    mockClipboard(() => write.promise);
    const { result, unmount } = renderHook(() => useClipboard('value'));

    let copyResult: Promise<boolean | undefined> = Promise.resolve(undefined);
    act(() => {
      copyResult = result.current.onCopy();
    });
    unmount();
    write.resolve();

    await expect(copyResult).resolves.toBeUndefined();
  });
});
