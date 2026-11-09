import { fetchChangelogHighlights } from '~/features/marketing/marketing.queries';
import { HomePage } from '~/pages/home/home.page';
import { marketingMeta } from '~/pages/seo/marketing-meta';
import { marketingCacheControl } from '~/pages/seo/seo.constants';

import { type Route } from './+types/index.route';

export function meta() {
  return marketingMeta({
    title: 'Leather',
    path: '/',
    description:
      'Leather is a wallet for Bitcoin and Stacks, designed for security, clarity, and growth.',
  });
}

export function headers() {
  return { 'Cache-Control': marketingCacheControl };
}

export async function loader() {
  return { changelogEntries: await fetchChangelogHighlights() };
}

export default function IndexRoute({ loaderData }: Route.ComponentProps) {
  return <HomePage changelogEntries={loaderData.changelogEntries} />;
}
