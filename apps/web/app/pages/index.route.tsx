import { fetchChangelogStrip } from '~/features/marketing/changelog-strip.queries';
import { HomePage } from '~/pages/home/home.page';
import { marketingHeaders } from '~/pages/seo/cache-control';
import { marketingMeta } from '~/pages/seo/marketing-meta';

import { type Route } from './+types/index.route';

export function meta() {
  return marketingMeta({
    title: 'Leather',
    path: '/',
    image: '/images/leather-og.png',
  });
}

export function headers() {
  return marketingHeaders();
}

export async function loader() {
  return { changelogEntries: await fetchChangelogStrip() };
}

export default function IndexRoute({ loaderData }: Route.ComponentProps) {
  return <HomePage changelogEntries={loaderData.changelogEntries} />;
}
