import { fetchHiroCursorPages, fetchHiroPages } from './hiro-multi-page';
import {
  type HiroCursorPageResponse,
  type HiroPageRequest,
  type HiroPageResponse,
} from './hiro-stacks-api.types';

describe(fetchHiroPages.name, () => {
  function createMockFetchFn(totalItems: number) {
    const mockFn = vi.fn(async (page: HiroPageRequest): Promise<HiroPageResponse<string>> => {
      return await Promise.resolve({
        limit: page.limit,
        offset: page.offset,
        total: totalItems,
        results: Array.from(
          { length: Math.min(page.limit, totalItems - page.offset) },
          (_, i) => `item-${page.offset + i}`
        ),
      });
    });
    return mockFn;
  }

  describe('some pages mode', () => {
    it('should fetch specified number of pages in parallel', async () => {
      const mockFetch = createMockFetchFn(100);

      const result = await fetchHiroPages(mockFetch, {
        limit: 20,
        pagesRequest: { pages: 2 },
      });

      expect(result).toHaveLength(40);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith({ limit: 20, offset: 0 });
      expect(mockFetch).toHaveBeenCalledWith({ limit: 20, offset: 20 });
    });

    it('should handle empty results', async () => {
      const mockFetch = createMockFetchFn(0);

      const result = await fetchHiroPages(mockFetch, {
        limit: 20,
        pagesRequest: { pages: 2 },
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('all pages mode', () => {
    it('should fetch all pages when total items span multiple pages', async () => {
      const mockFetch = createMockFetchFn(55);

      const result = await fetchHiroPages(mockFetch, {
        limit: 20,
        pagesRequest: { allPages: true },
      });

      expect(result).toHaveLength(55);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should respect stopAfter parameter', async () => {
      const mockFetch = createMockFetchFn(100);

      const result = await fetchHiroPages(mockFetch, {
        limit: 20,
        pagesRequest: { allPages: true, stopAfter: 2 },
      });

      expect(result).toHaveLength(40);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle single page result', async () => {
      const mockFetch = createMockFetchFn(15);

      const result = await fetchHiroPages(mockFetch, {
        limit: 20,
        pagesRequest: { allPages: true },
      });

      expect(result).toHaveLength(15);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle empty results', async () => {
      const mockFetch = createMockFetchFn(0);

      const result = await fetchHiroPages(mockFetch, {
        limit: 20,
        pagesRequest: { allPages: true },
      });

      expect(result).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe(fetchHiroCursorPages.name, () => {
  function createMockCursorFetchFn(totalPages: number) {
    return vi.fn(async (cursor: string | null): Promise<HiroCursorPageResponse<string>> => {
      const pageIndex = cursor === null ? 0 : Number(cursor.replace('page-', ''));
      const isLastPage = pageIndex >= totalPages - 1;
      return await Promise.resolve({
        limit: 2,
        total: totalPages * 2,
        cursor: {
          next: isLastPage ? null : `page-${pageIndex + 1}`,
          previous: null,
          current: cursor,
        },
        results: totalPages === 0 ? [] : [`item-${pageIndex}-0`, `item-${pageIndex}-1`],
      });
    });
  }

  it('should follow cursor.next until it is null', async () => {
    const mockFetch = createMockCursorFetchFn(3);

    const result = await fetchHiroCursorPages(mockFetch, { maxPages: 10 });

    expect(result).toEqual([
      'item-0-0',
      'item-0-1',
      'item-1-0',
      'item-1-1',
      'item-2-0',
      'item-2-1',
    ]);
    expect(mockFetch.mock.calls).toEqual([[null], ['page-1'], ['page-2']]);
  });

  it('should stop after maxPages', async () => {
    const mockFetch = createMockCursorFetchFn(5);

    const result = await fetchHiroCursorPages(mockFetch, { maxPages: 2 });

    expect(result).toHaveLength(4);
    expect(mockFetch.mock.calls).toEqual([[null], ['page-1']]);
  });

  it('should make one call for an empty first page', async () => {
    const mockFetch = createMockCursorFetchFn(0);

    const result = await fetchHiroCursorPages(mockFetch, { maxPages: 10 });

    expect(result).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
