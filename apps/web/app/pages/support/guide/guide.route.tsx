import { NotFoundErrorBoundary } from '~/pages/error/not-found-error-boundary';
import { notFoundMeta } from '~/pages/error/not-found-meta';
import {
  type CmsGuide,
  resolveCmsContentSlug,
  throwForContentResolution,
} from '~/pages/redirects/content-slug-loader';
import { getGuidePath } from '~/pages/redirects/content-slug-resolver';
import { marketingCacheHeaders, marketingMeta } from '~/pages/seo/marketing-meta';
import { Guide } from '~/pages/support/guide/guide';

import { type Route } from './+types/guide.route';

export async function loader({ params, request }: Route.LoaderArgs): Promise<{ guide: CmsGuide }> {
  const slug = params.guideSlug;
  const resolution = await resolveCmsContentSlug(slug);
  if (resolution.kind === 'guide') return { guide: resolution.guide };
  return throwForContentResolution(slug, resolution, request);
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return notFoundMeta();
  const { guide } = loaderData;
  return marketingMeta({
    title: guide.title,
    path: getGuidePath(guide.slug.current),
    description: guide.summary,
  });
}

export function headers() {
  return marketingCacheHeaders;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <NotFoundErrorBoundary error={error} />;
}

export default function GuideRoute() {
  return <Guide />;
}
