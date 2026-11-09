import { PostListPage } from '~/pages/posts/components/post-list';
import {
  filterPostsIndex,
  paginatePosts,
  parsePageParam,
  searchPosts,
} from '~/pages/posts/posts-index.utils';
import { fetchGuideSlugs, fetchPostSummaries } from '~/pages/posts/posts.queries';
import { marketingMeta } from '~/pages/seo/marketing-meta';
import { marketingCacheControl } from '~/pages/seo/seo.constants';

import { type Route } from './+types/posts-index.route';

export function meta() {
  return marketingMeta({
    title: 'Posts',
    path: '/posts',
    description: 'Guides, explainers and updates about Bitcoin, Stacks and Leather.',
  });
}

export function headers() {
  return { 'Cache-Control': marketingCacheControl };
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const page = parsePageParam(url.searchParams.get('page'));

  const [posts, guideSlugs] = await Promise.all([fetchPostSummaries(), fetchGuideSlugs()]);
  const results = searchPosts(filterPostsIndex(posts, guideSlugs), query);

  return { ...paginatePosts(results, page), page, query };
}

export default function PostsIndexRoute({ loaderData }: Route.ComponentProps) {
  const { posts, hasMore, page, query } = loaderData;
  return (
    <PostListPage
      title="Posts"
      posts={posts}
      hasMore={hasMore}
      page={page}
      query={query}
      searchable
      emptyMessage={query ? `No posts match “${query}”.` : 'No posts yet.'}
    />
  );
}
