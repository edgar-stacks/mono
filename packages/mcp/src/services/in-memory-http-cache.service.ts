import { QueryClient } from '@tanstack/query-core';

import { type HttpCacheOptions, HttpCacheService } from '@leather.io/services';

const maxTimerDelayMs = 2 ** 31 - 1;

const queryClient = new QueryClient();

export class InMemoryHttpCacheService extends HttpCacheService {
  fetchWithCacheInternal<T>(
    key: unknown[],
    fetchFn: () => Promise<T>,
    options: HttpCacheOptions = {}
  ): Promise<T> {
    const ttl = options.ttl === undefined ? 0 : Math.min(options.ttl, maxTimerDelayMs);
    return queryClient.fetchQuery({
      queryKey: key,
      queryFn: fetchFn,
      staleTime: ttl,
      gcTime: ttl,
      retry: false,
    });
  }

  async clearInternal(cacheKey: string): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: [cacheKey] });
  }
}
