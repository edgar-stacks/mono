const marketingCacheControl = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';

export const seoFileCacheControl = 'public, max-age=3600, s-maxage=3600';

export function marketingHeaders() {
  return { 'Cache-Control': marketingCacheControl };
}
