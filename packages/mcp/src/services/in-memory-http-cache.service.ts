import { QueryClient } from '@tanstack/query-core';

import { type HttpCacheOptions, HttpCacheService } from '@leather.io/services';

const queryClient = new QueryClient();

export class InMemoryHttpCacheService extends HttpCacheService {
  async fetchWithCacheInternal<T>(
    key: unknown[],
    fetchFn: () => Promise<T>,
    options: HttpCacheOptions = {}
  ): Promise<T> {
    return queryClient.fetchQuery({
      queryKey: key,
      queryFn: fetchFn,
      staleTime: options.ttl ?? 0,
      gcTime: options.ttl ?? 0,
      retry: false,
    });
  }

  async clearInternal(key: string): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: [key] });
  }
}
