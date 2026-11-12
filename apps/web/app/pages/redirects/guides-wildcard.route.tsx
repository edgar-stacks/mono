import { type Route } from './+types/guides-wildcard.route';
import { sanityContentFetchers } from './content-fetchers';
import { resolveContentSlug } from './content-slug-resolver';
import { contentSlugResponse, notFoundResponse, permanentRedirect } from './content-slug-response';
import { getLegacyPathTarget } from './legacy-path-redirects';
import { getWildcardSegments } from './wildcard-segments';

export async function loader({ params, request }: Route.LoaderArgs) {
  const segments = getWildcardSegments(params['*']);
  const [slug] = segments;

  if (!slug) throw permanentRedirect(request, getLegacyPathTarget('/guides') ?? '/support');
  if (segments.length > 1) throw notFoundResponse();

  const resolution = await resolveContentSlug(slug, sanityContentFetchers);
  throw contentSlugResponse(request, resolution);
}

export default function GuidesWildcardRoute() {
  return null;
}
