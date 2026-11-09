import { isDeprecatedContentSlug } from '~/pages/redirects/shared-redirect-logic';

export interface PostListItem {
  _id: string;
  title: string;
  slug: string;
  summary: string | null;
  publishedAt: string | null;
  category: string | null;
  imageUrl: string | null;
}

const excludedPostsIndexCategories = ['Apps', 'Legal', 'Tokens'];
const newsCategory = 'News';
const firstPage = 1;

export function isPostsIndexPost(post: PostListItem, guideSlugs: ReadonlySet<string>) {
  if (isDeprecatedContentSlug(post.slug)) return false;
  if (guideSlugs.has(post.slug)) return false;
  return post.category === null || !excludedPostsIndexCategories.includes(post.category);
}

export function isNewsPost(post: PostListItem) {
  return post.category === newsCategory && !isDeprecatedContentSlug(post.slug);
}

export function filterPostsByQuery(posts: PostListItem[], query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return posts;
  return posts.filter(post => {
    const text = `${post.title} ${post.summary ?? ''} ${post.category ?? ''}`.toLowerCase();
    return terms.every(term => text.includes(term));
  });
}

export function parsePageParam(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > firstPage ? page : firstPage;
}

export function getPostsPage(posts: PostListItem[], page: number, pageSize: number) {
  const visibleCount = page * pageSize;
  return {
    posts: posts.slice(0, visibleCount),
    nextPage: posts.length > visibleCount ? page + 1 : null,
  };
}
