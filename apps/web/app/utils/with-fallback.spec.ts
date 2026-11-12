import { withFallback } from './with-fallback';

describe(withFallback.name, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the request result when it resolves in time', async () => {
    await expect(withFallback(Promise.resolve(['post']), [])).resolves.toEqual(['post']);
  });

  it('returns the fallback when the request fails', async () => {
    await expect(withFallback(Promise.reject(new Error('Sanity is down')), [])).resolves.toEqual(
      []
    );
  });

  it('returns the fallback when the request takes longer than the timeout', async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise<string[]>(resolve => setTimeout(resolve, 60_000, ['late']));
    const result = withFallback(neverResolves, [], 5_000);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(result).resolves.toEqual([]);
  });
});
