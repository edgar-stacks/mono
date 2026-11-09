import { fetchChangelogHighlights } from '~/features/marketing/marketing.queries';
import { AppsPage } from '~/pages/apps/apps.page';
import { marketingMeta } from '~/pages/seo/marketing-meta';
import { marketingCacheControl } from '~/pages/seo/seo.constants';

import { type Route } from './+types/apps.route';

export function meta() {
  return marketingMeta({
    title: 'Apps',
    path: '/apps',
    description: 'Explore core tokens, earning opportunities and apps on Bitcoin and Stacks.',
  });
}

export function headers() {
  return { 'Cache-Control': marketingCacheControl };
}

export async function loader() {
  return { changelogEntries: await fetchChangelogHighlights() };
}

export default function AppsRoute({ loaderData }: Route.ComponentProps) {
  return <AppsPage changelogEntries={loaderData.changelogEntries} />;
}
