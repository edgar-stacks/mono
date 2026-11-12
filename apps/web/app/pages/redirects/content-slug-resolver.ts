import { legacyContentRedirects, retiredContentSlugs } from './legacy-content-redirects';
import { getDeprecationTarget } from './shared-redirect-logic';

export interface ContentFetchers<Guide, Post> {
  fetchGuide(slug: string): Promise<Guide | null>;
  fetchPost(slug: string): Promise<Post | null>;
}

export type ContentSlugResolution<Guide, Post> =
  | { kind: 'guide'; path: string; guide: Guide }
  | { kind: 'post'; path: string; post: Post }
  | { kind: 'redirect'; path: string }
  | { kind: 'gone' }
  | { kind: 'not-found' };

function isValidSlug(slug: string) {
  return slug.trim().length > 0 && !slug.includes('/');
}

export function guidePath(slug: string) {
  return `/support/${encodeURIComponent(slug)}`;
}

export function postPath(slug: string) {
  return `/posts/${encodeURIComponent(slug)}`;
}

export function getLegacyContentTarget(slug: string) {
  if (!Object.hasOwn(legacyContentRedirects, slug)) return null;
  return legacyContentRedirects[slug] ?? null;
}

function isRetiredContentSlug(slug: string) {
  return retiredContentSlugs.includes(slug);
}

export async function resolveContentSlug<Guide, Post>(
  slug: string,
  fetchers: ContentFetchers<Guide, Post>
): Promise<ContentSlugResolution<Guide, Post>> {
  if (!isValidSlug(slug)) return { kind: 'not-found' };

  const deprecationTarget = getDeprecationTarget(slug);
  if (deprecationTarget) return { kind: 'redirect', path: deprecationTarget };

  const [guide, post] = await Promise.all([fetchers.fetchGuide(slug), fetchers.fetchPost(slug)]);
  if (guide) return { kind: 'guide', path: guidePath(slug), guide };
  if (post) return { kind: 'post', path: postPath(slug), post };

  const legacyTarget = getLegacyContentTarget(slug);
  if (legacyTarget) return { kind: 'redirect', path: legacyTarget };

  if (isRetiredContentSlug(slug)) return { kind: 'gone' };

  return { kind: 'not-found' };
}
