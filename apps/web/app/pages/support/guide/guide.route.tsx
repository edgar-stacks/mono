import { notFoundMeta } from '~/pages/error/not-found-meta';
import { type ContentGuide, sanityContentFetchers } from '~/pages/redirects/content-fetchers';
import { guidePath, resolveContentSlug } from '~/pages/redirects/content-slug-resolver';
import { contentSlugResponse } from '~/pages/redirects/content-slug-response';
import { marketingHeaders } from '~/pages/seo/cache-control';
import { marketingMeta } from '~/pages/seo/marketing-meta';
import { Guide } from '~/pages/support/guide/guide';

import { type Route } from './+types/guide.route';

export function meta({ data, params }: Route.MetaArgs) {
  if (!data) return notFoundMeta();
  return marketingMeta({
    title: `${data.guide.title} – Leather`,
    path: guidePath(params.guideSlug),
    description: data.guide.summary,
  });
}

export function headers() {
  return marketingHeaders();
}

export async function loader({
  params,
  request,
}: Route.LoaderArgs): Promise<{ guide: ContentGuide }> {
  const resolution = await resolveContentSlug(params.guideSlug, sanityContentFetchers);
  if (resolution.kind === 'guide') return { guide: resolution.guide };
  throw contentSlugResponse(request, resolution);
}

export default function GuideRoute() {
  return <Guide />;
}
