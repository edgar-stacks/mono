import { isDeprecatedContentSlug } from '~/pages/redirects/shared-redirect-logic';

export interface IndexPost {
  _id: string;
  title: string;
  slug: string;
  category: string | null;
  summary: string | null;
  publishedAt: string | null;
}

export const postsPageSize = 10;

const postsIndexExcludedCategories = ['Apps', 'Legal', 'Tokens'];

function isExcludedCategory(category: string | null) {
  return category !== null && postsIndexExcludedCategories.includes(category);
}

function isListablePost(post: IndexPost) {
  return !isDeprecatedContentSlug(post.slug);
}

export function filterIndexPosts(posts: IndexPost[], guideSlugs: string[]) {
  const guideSlugSet = new Set(guideSlugs);
  return posts.filter(
    post =>
      isListablePost(post) && !guideSlugSet.has(post.slug) && !isExcludedCategory(post.category)
  );
}

export function filterNewsPosts(posts: IndexPost[]) {
  return posts.filter(isListablePost);
}

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function searchPosts(posts: IndexPost[], query: string | null) {
  if (query === null) return posts;
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return posts;
  return posts.filter(post =>
    [post.title, post.summary, post.category].some(
      text => text !== null && normalizeSearchText(text).includes(normalizedQuery)
    )
  );
}
