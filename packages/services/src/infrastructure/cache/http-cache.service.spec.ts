import { beforeEach, describe, expect, it, vi } from 'vitest';

import { minutesInMs } from '@leather.io/utils';

import { type HttpCacheOptions, HttpCacheService } from './http-cache.service';

interface FetchWithCacheInternalCall {
  key: unknown[];
  options?: HttpCacheOptions;
}

class RecordingHttpCacheService extends HttpCacheService {
  calls: FetchWithCacheInternalCall[] = [];

  fetchWithCacheInternal<T>(
    key: unknown[],
    fetchFn: () => Promise<T>,
    options?: HttpCacheOptions
  ): Promise<T> {
    this.calls.push({ key, options });
    return fetchFn();
  }

  clearInternal(): Promise<void> {
    return Promise.resolve();
  }
}

describe(HttpCacheService.name, () => {
  const name = 'name.btc';
  const response = { name };
  const fetchFn = vi.fn(() => Promise.resolve(response));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchWithCache', () => {
    it('caches with the configured ttl of the key by default', async () => {
      const cache = new RecordingHttpCacheService();

      await expect(cache.fetchWithCache(['bns-v2-api-name', name], fetchFn)).resolves.toEqual(
        response
      );

      expect(cache.calls).toEqual([
        { key: ['http-bns-v2-api-name', name], options: { ttl: minutesInMs(2) } },
      ]);
    });

    it('bypasses the cache when skipCache is true', async () => {
      const cache = new RecordingHttpCacheService();

      await expect(
        cache.fetchWithCache(['bns-v2-api-name', name], fetchFn, { skipCache: true })
      ).resolves.toEqual(response);

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(cache.calls).toEqual([]);
    });

    it('keeps the configured ttl of the key when skipCache is false', async () => {
      const cache = new RecordingHttpCacheService();

      await cache.fetchWithCache(['bns-v2-api-name', name], fetchFn, { skipCache: false });

      expect(cache.calls).toEqual([
        { key: ['http-bns-v2-api-name', name], options: { ttl: minutesInMs(2) } },
      ]);
    });

    it('merges the passed options over the configured options of the key', async () => {
      const cache = new RecordingHttpCacheService();

      await cache.fetchWithCache(['bns-v2-api-name', name], fetchFn, { ttl: minutesInMs(5) });

      expect(cache.calls).toEqual([
        { key: ['http-bns-v2-api-name', name], options: { ttl: minutesInMs(5) } },
      ]);
    });
  });
});
