import { fetchChangelogStrip } from '~/features/marketing/changelog-strip.queries';
import { marketingHeaders } from '~/pages/seo/cache-control';
import { marketingMeta } from '~/pages/seo/marketing-meta';

import { type Route } from './+types/apps.route';
import { AppsPage } from './apps.page';

export function meta() {
  return marketingMeta({
    title: 'Apps – Leather',
    path: '/apps',
    description:
      'Explore core tokens, ways to earn on Stacks and the apps you can use with Leather.',
  });
}

export function headers() {
  return marketingHeaders();
}

export async function loader() {
  return { changelogEntries: await fetchChangelogStrip() };
}

export default function AppsRoute({ loaderData }: Route.ComponentProps) {
  return <AppsPage changelogEntries={loaderData.changelogEntries} />;
}
