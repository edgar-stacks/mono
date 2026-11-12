import { marketingHeaders } from '~/pages/seo/cache-control';
import { marketingMeta } from '~/pages/seo/marketing-meta';

import { type Route } from './+types/posts-index.route';
import { PostsIndexPage } from './posts-index.page';
import { fetchPostsIndex } from './posts-index.queries';
import { filterIndexPosts, searchPosts } from './posts-index.utils';

export function meta() {
  return marketingMeta({
    title: 'All posts – Leather',
    path: '/posts',
    description:
      'Stay up to date and read about the latest integrations, partnerships, new features and more from Leather Bitcoin wallet with the Leather blog.',
  });
}

export function headers() {
  return marketingHeaders();
}

export async function loader({ request }: Route.LoaderArgs) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const { posts, guideSlugs } = await fetchPostsIndex();
  const indexPosts = filterIndexPosts(posts, guideSlugs);
  return {
    posts: searchPosts(indexPosts, query),
    query,
    totalCount: indexPosts.length,
  };
}

export default function PostsIndexRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PostsIndexPage
      key={loaderData.query}
      posts={loaderData.posts}
      query={loaderData.query}
      totalCount={loaderData.totalCount}
    />
  );
}
