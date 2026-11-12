import { fetchNewsPosts } from '~/pages/posts/posts-index.queries';
import { filterNewsPosts } from '~/pages/posts/posts-index.utils';
import { marketingHeaders } from '~/pages/seo/cache-control';
import { marketingMeta } from '~/pages/seo/marketing-meta';

import { type Route } from './+types/news.route';
import { NewsPage } from './news.page';

export function meta() {
  return marketingMeta({
    title: 'News – Leather',
    path: '/news',
    description: 'The latest product launches, partnerships and announcements from Leather.',
  });
}

export function headers() {
  return marketingHeaders();
}

export async function loader() {
  return { posts: filterNewsPosts(await fetchNewsPosts()) };
}

export default function NewsRoute({ loaderData }: Route.ComponentProps) {
  return <NewsPage posts={loaderData.posts} />;
}
