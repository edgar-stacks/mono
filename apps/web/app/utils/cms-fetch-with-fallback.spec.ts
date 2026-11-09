import { fetchCmsWithFallback } from './cms-fetch-with-fallback';

describe(fetchCmsWithFallback.name, () => {
  it('returns the fetched content', async () => {
    await expect(fetchCmsWithFallback(() => Promise.resolve(['post']), [])).resolves.toEqual([
      'post',
    ]);
  });

  it('returns the fallback when the fetch fails', async () => {
    await expect(
      fetchCmsWithFallback(() => Promise.reject(new Error('Sanity is down')), [])
    ).resolves.toEqual([]);
  });

  it('returns the fallback and aborts the fetch when it takes too long', async () => {
    let receivedSignal: AbortSignal | undefined;
    const result = await fetchCmsWithFallback(
      signal => {
        receivedSignal = signal;
        return new Promise<string[]>(() => undefined);
      },
      [],
      10
    );

    expect(result).toEqual([]);
    expect(receivedSignal?.aborted).toBe(true);
  });
});
