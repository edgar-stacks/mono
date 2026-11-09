import { type RouteChromeHandle } from '~/layouts/route-chrome';
import { ExplorerPage } from '~/pages/explorer/explorer.page';
import { marketingMeta } from '~/pages/seo/marketing-meta';
import { marketingCacheControl } from '~/pages/seo/seo.constants';

export const handle = { chrome: 'none' } satisfies RouteChromeHandle;

export function meta() {
  return marketingMeta({
    title: 'Explorer',
    path: '/explorer',
    description: 'Grow your Bitcoin with apps on Stacks.',
  });
}

export function headers() {
  return { 'Cache-Control': marketingCacheControl };
}

export default function ExplorerRoute() {
  return <ExplorerPage />;
}
