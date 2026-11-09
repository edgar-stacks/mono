import { PostListPage } from '~/pages/posts/components/post-list';
import { filterNewsPosts, paginatePosts, parsePageParam } from '~/pages/posts/posts-index.utils';
import { fetchPostSummaries } from '~/pages/posts/posts.queries';
import { marketingMeta } from '~/pages/seo/marketing-meta';
import { marketingCacheControl } from '~/pages/seo/seo.constants';

import { type Route } from './+types/news.route';

export function meta() {
  return marketingMeta({
    title: 'News',
    path: '/news',
    description: 'Product announcements and partnership news from Leather.',
  });
}

export function headers() {
  return { 'Cache-Control': marketingCacheControl };
}

export async function loader({ request }: Route.LoaderArgs) {
  const page = parsePageParam(new URL(request.url).searchParams.get('page'));
  const posts = filterNewsPosts(await fetchPostSummaries());
  return { ...paginatePosts(posts, page), page };
}

export default function NewsRoute({ loaderData }: Route.ComponentProps) {
  const { posts, hasMore, page } = loaderData;
  return (
    <PostListPage
      title="News"
      posts={posts}
      hasMore={hasMore}
      page={page}
      emptyMessage="No news yet."
    />
  );
}
