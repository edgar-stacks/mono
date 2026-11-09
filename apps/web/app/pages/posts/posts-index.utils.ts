import { isDeprecatedContentSlug } from '~/pages/redirects/shared-redirect-logic';

export interface PostSummary {
  _id: string;
  title: string;
  slug: string;
  summary?: string | null;
  category?: string | null;
  publishedAt?: string | null;
}

export const postsPageSize = 12;

const postsIndexExcludedCategories = ['Apps', 'Legal', 'Tokens'];
const newsCategory = 'News';

function isListablePost(post: PostSummary) {
  return !isDeprecatedContentSlug(post.slug);
}

export function filterPostsIndex(posts: PostSummary[], guideSlugs: readonly string[]) {
  const guides = new Set(guideSlugs);
  return posts.filter(
    post =>
      isListablePost(post) &&
      !guides.has(post.slug) &&
      !(post.category && postsIndexExcludedCategories.includes(post.category))
  );
}

export function filterNewsPosts(posts: PostSummary[]) {
  return posts.filter(post => isListablePost(post) && post.category === newsCategory);
}

export function searchPosts(posts: PostSummary[], query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return posts;
  return posts.filter(post => {
    const haystack = `${post.title} ${post.summary ?? ''}`.toLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}

export function parsePageParam(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function paginatePosts(posts: PostSummary[], page: number, pageSize = postsPageSize) {
  return { posts: posts.slice(0, page * pageSize), hasMore: posts.length > page * pageSize };
}
