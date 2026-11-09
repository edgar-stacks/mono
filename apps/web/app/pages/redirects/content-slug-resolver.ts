import { legacyContentRedirects, retiredContentSlugs } from './legacy-content-redirects';
import { getDeprecationTarget } from './shared-redirect-logic';

export interface ContentFetchers<TGuide, TPost> {
  fetchGuide(slug: string): Promise<TGuide | null>;
  fetchPost(slug: string): Promise<TPost | null>;
}

export type ContentSlugResolution<TGuide, TPost> =
  | { kind: 'guide'; path: string; guide: TGuide }
  | { kind: 'post'; path: string; post: TPost }
  | { kind: 'redirect'; path: string }
  | { kind: 'gone' }
  | { kind: 'not-found' };

function getGuidePath(slug: string) {
  return `/support/${slug}`;
}

function getPostPath(slug: string) {
  return `/posts/${slug}`;
}

export function getLegacyContentTarget(slug: string): string | null {
  return legacyContentRedirects[slug] ?? null;
}

function isRetiredContentSlug(slug: string) {
  return retiredContentSlugs.includes(slug);
}

export async function resolveContentSlug<TGuide, TPost>(
  slug: string,
  fetchers: ContentFetchers<TGuide, TPost>
): Promise<ContentSlugResolution<TGuide, TPost>> {
  const deprecationTarget = getDeprecationTarget(slug);
  if (deprecationTarget) return { kind: 'redirect', path: deprecationTarget };

  const [guide, post] = await Promise.all([fetchers.fetchGuide(slug), fetchers.fetchPost(slug)]);
  if (guide) return { kind: 'guide', path: getGuidePath(slug), guide };
  if (post) return { kind: 'post', path: getPostPath(slug), post };

  if (isRetiredContentSlug(slug)) return { kind: 'gone' };

  const legacyTarget = getLegacyContentTarget(slug);
  if (legacyTarget) return { kind: 'redirect', path: legacyTarget };

  return { kind: 'not-found' };
}
