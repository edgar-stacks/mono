import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useClipboard } from './use-clipboard.web';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function setClipboard(clipboard: Pick<Clipboard, 'writeText'> | undefined) {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
}

function deferred() {
  const handlers: { resolve?(): void; reject?(reason: unknown): void } = {};
  const promise = new Promise<void>((resolve, reject) => {
    handlers.resolve = resolve;
    handlers.reject = reject;
  });
  return {
    promise,
    resolve() {
      handlers.resolve?.();
    },
    reject(reason: unknown) {
      handlers.reject?.(reason);
    },
  };
}

describe('useClipboard', () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  });

  it('reports copied only after the write resolves', async () => {
    const write = deferred();
    const writeText = vi.fn(() => write.promise);
    setClipboard({ writeText });
    const { result } = renderHook(() => useClipboard('bc1q-address'));

    let copyResult: Promise<boolean | undefined> = Promise.resolve(undefined);
    act(() => {
      copyResult = result.current.onCopy();
    });

    expect(writeText).toHaveBeenCalledWith('bc1q-address');
    expect(result.current.hasCopied).toBe(false);

    await act(async () => {
      write.resolve();
      await copyResult;
    });

    await expect(copyResult).resolves.toBe(true);
    expect(result.current.hasCopied).toBe(true);
    expect(result.current.hasCopyFailed).toBe(false);
  });

  it('clears copied after 1250ms', async () => {
    setClipboard({ writeText: vi.fn(() => Promise.resolve()) });
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
    setClipboard({ writeText: vi.fn(() => Promise.reject(new Error('denied'))) });
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
    setClipboard(undefined);
    const { result } = renderHook(() => useClipboard('value'));

    let copyResult: boolean | undefined;
    await act(async () => {
      copyResult = await result.current.onCopy();
    });

    expect(copyResult).toBe(false);
    expect(result.current.hasCopyFailed).toBe(true);
  });

  it('drops a stale result when a newer copy starts', async () => {
    const first = deferred();
    const second = deferred();
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    setClipboard({ writeText });
    const { result } = renderHook(() => useClipboard('value'));

    let firstResult: Promise<boolean | undefined> = Promise.resolve(undefined);
    let secondResult: Promise<boolean | undefined> = Promise.resolve(undefined);
    act(() => {
      firstResult = result.current.onCopy();
      secondResult = result.current.onCopy();
    });

    await act(async () => {
      second.resolve();
      await secondResult;
      first.reject(new Error('denied'));
      await firstResult;
    });

    await expect(firstResult).resolves.toBeUndefined();
    await expect(secondResult).resolves.toBe(true);
    expect(result.current.hasCopied).toBe(true);
    expect(result.current.hasCopyFailed).toBe(false);
  });

  it('drops the result when it arrives after unmount', async () => {
    const write = deferred();
    setClipboard({ writeText: vi.fn(() => write.promise) });
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
