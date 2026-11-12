import { type Route } from './+types/support-guide-redirect.route';
import { sanityContentFetchers } from './content-fetchers';
import { resolveContentSlug } from './content-slug-resolver';
import { contentSlugResponse } from './content-slug-response';

export async function loader({ params, request }: Route.LoaderArgs) {
  const resolution = await resolveContentSlug(params.slug, sanityContentFetchers);
  throw contentSlugResponse(request, resolution);
}

export default function SupportGuideRedirectRoute() {
  return null;
}
