import { fetchCmsWithFallback } from './cms-fetch';

describe(fetchCmsWithFallback.name, () => {
  it('returns the fetched value', async () => {
    await expect(fetchCmsWithFallback(() => Promise.resolve(['entry']), [])).resolves.toEqual([
      'entry',
    ]);
  });

  it('returns the fallback when the fetch fails', async () => {
    await expect(
      fetchCmsWithFallback(() => Promise.reject(new Error('Sanity is down')), [])
    ).resolves.toEqual([]);
  });

  it('returns the fallback and aborts when the fetch takes too long', async () => {
    let aborted = false;
    const result = await fetchCmsWithFallback(
      signal =>
        new Promise<string[]>(resolve => {
          signal.addEventListener('abort', () => {
            aborted = true;
          });
          setTimeout(() => resolve(['late']), 50);
        }),
      [],
      10
    );
    expect(result).toEqual([]);
    expect(aborted).toBe(true);
  });
});
