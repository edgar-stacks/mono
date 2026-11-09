import { DevelopersPage } from '~/pages/developers/developers.page';
import { marketingMeta } from '~/pages/seo/marketing-meta';
import { marketingCacheControl } from '~/pages/seo/seo.constants';

export function meta() {
  return marketingMeta({
    title: 'Developers',
    path: '/developers',
    description:
      'Quick-start guides and API references for building with the Leather wallet on Bitcoin and Stacks.',
  });
}

export function headers() {
  return { 'Cache-Control': marketingCacheControl };
}

export default function DevelopersRoute() {
  return <DevelopersPage />;
}
