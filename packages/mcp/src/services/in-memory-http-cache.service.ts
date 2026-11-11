import { QueryClient } from '@tanstack/query-core';

import { type HttpCacheOptions, HttpCacheService } from '@leather.io/services';

const queryClient = new QueryClient();
const maxTimerDelayMs = 2_147_483_647;

export class InMemoryHttpCacheService extends HttpCacheService {
  async fetchWithCacheInternal<T>(
    key: unknown[],
    fetchFn: () => Promise<T>,
    options: HttpCacheOptions = {}
  ): Promise<T> {
    const ttl = options.ttl ?? 0;
    return queryClient.fetchQuery({
      queryKey: key,
      queryFn: fetchFn,
      staleTime: ttl,
      gcTime: Math.min(ttl, maxTimerDelayMs),
      retry: false,
    });
  }

  async clearInternal(key: string): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: [key] });
  }
}
