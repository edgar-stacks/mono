import { getLegacyContentTarget, isRetiredContentSlug } from './legacy-content-redirects';
import { getDeprecationTarget } from './shared-redirect-logic';

export interface ContentFetchers<TGuide, TPost> {
  fetchGuide(slug: string): Promise<TGuide | null>;
  fetchPost(slug: string): Promise<TPost | null>;
}

export type ContentSlugResolution<TGuide, TPost> =
  | { kind: 'guide'; guide: TGuide }
  | { kind: 'post'; post: TPost }
  | { kind: 'redirect'; to: string }
  | { kind: 'gone' }
  | { kind: 'not-found' };

export function getGuidePath(slug: string) {
  return `/support/${encodeURIComponent(slug)}`;
}

export function getPostPath(slug: string) {
  return `/posts/${encodeURIComponent(slug)}`;
}

export async function resolveContentSlug<TGuide, TPost>(
  slug: string,
  fetchers: ContentFetchers<TGuide, TPost>
): Promise<ContentSlugResolution<TGuide, TPost>> {
  const deprecationTarget = getDeprecationTarget(slug);
  if (deprecationTarget) return { kind: 'redirect', to: deprecationTarget };

  const [guide, post] = await Promise.all([fetchers.fetchGuide(slug), fetchers.fetchPost(slug)]);
  if (guide) return { kind: 'guide', guide };
  if (post) return { kind: 'post', post };

  if (isRetiredContentSlug(slug)) return { kind: 'gone' };

  const legacyTarget = getLegacyContentTarget(slug);
  if (legacyTarget) return { kind: 'redirect', to: legacyTarget };

  return { kind: 'not-found' };
}

export function getResolvedContentPath<TGuide, TPost>(
  slug: string,
  resolution: ContentSlugResolution<TGuide, TPost>
) {
  if (resolution.kind === 'guide') return getGuidePath(slug);
  if (resolution.kind === 'post') return getPostPath(slug);
  if (resolution.kind === 'redirect') return resolution.to;
  return null;
}
