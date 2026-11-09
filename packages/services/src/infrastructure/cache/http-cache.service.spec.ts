import { describe, expect, it, vi } from 'vitest';

import { minutesInMs } from '@leather.io/utils';

import { type HttpCacheOptions, HttpCacheService } from './http-cache.service';

interface RecordedCall {
  key: unknown[];
  options?: HttpCacheOptions;
}

class RecordingHttpCacheService extends HttpCacheService {
  calls: RecordedCall[] = [];

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
  describe('fetchWithCache', () => {
    it('caches with the configured ttl of the key by default', async () => {
      const cache = new RecordingHttpCacheService();

      await expect(
        cache.fetchWithCache(['bns-v2-api-name', 'name.btc'], () => Promise.resolve('result'))
      ).resolves.toBe('result');

      expect(cache.calls).toEqual([
        { key: ['http-bns-v2-api-name', 'name.btc'], options: { ttl: minutesInMs(2) } },
      ]);
    });

    it('calls the fetch function directly when skipCache is true', async () => {
      const cache = new RecordingHttpCacheService();
      const fetchFn = vi.fn(() => Promise.resolve('result'));

      await expect(
        cache.fetchWithCache(['bns-v2-api-name', 'name.btc'], fetchFn, { skipCache: true })
      ).resolves.toBe('result');

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(cache.calls).toEqual([]);
    });

    it('keeps the configured ttl of the key when skipCache is false', async () => {
      const cache = new RecordingHttpCacheService();

      await cache.fetchWithCache(['bns-v2-api-name', 'name.btc'], () => Promise.resolve('result'), {
        skipCache: false,
      });

      expect(cache.calls).toEqual([
        { key: ['http-bns-v2-api-name', 'name.btc'], options: { ttl: minutesInMs(2) } },
      ]);
    });
  });
});
