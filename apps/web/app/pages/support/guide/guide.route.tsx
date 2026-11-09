import {
  contentResolutionResponse,
  sanityContentFetchers,
} from '~/pages/redirects/content-slug-loader';
import { resolveContentSlug } from '~/pages/redirects/content-slug-resolver';
import { marketingMeta } from '~/pages/seo/marketing-meta';
import { Guide } from '~/pages/support/guide/guide';

import { type HelpCenterGuideBySlugQueryResult } from '@leather.io/cms';

import { type Route } from './+types/guide.route';

interface GuideLoaderData {
  guide: NonNullable<HelpCenterGuideBySlugQueryResult>;
  path: string;
}

export async function loader({ params, request }: Route.LoaderArgs): Promise<GuideLoaderData> {
  const resolution = await resolveContentSlug(params.guideSlug, sanityContentFetchers);

  if (resolution.kind !== 'guide') throw contentResolutionResponse(resolution, request);

  return { guide: resolution.guide, path: resolution.path };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { guide, path } = loaderData;
  return marketingMeta({ title: guide.title, path, description: guide.summary });
}

export default function GuideRoute() {
  return <Guide />;
}
