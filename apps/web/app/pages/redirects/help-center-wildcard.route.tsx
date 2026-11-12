import { type Route } from './+types/help-center-wildcard.route';
import { sanityContentFetchers } from './content-fetchers';
import { resolveContentSlug } from './content-slug-resolver';
import { contentSlugResponse, notFoundResponse, permanentRedirect } from './content-slug-response';
import { getWildcardSegments } from './wildcard-segments';

export async function loader({ params, request }: Route.LoaderArgs) {
  const segments = getWildcardSegments(params['*']);

  if (segments.length === 0) throw permanentRedirect(request, '/support');
  if (segments.length === 1 && segments[0] === 'search') {
    throw permanentRedirect(request, '/support/search');
  }

  const slug = getHelpCenterSlug(segments);
  if (!slug) throw notFoundResponse();

  const resolution = await resolveContentSlug(slug, sanityContentFetchers);
  throw contentSlugResponse(request, resolution);
}

function getHelpCenterSlug(segments: string[]) {
  const [first, second] = segments;
  if (segments.length === 1) return first ?? null;
  if (segments.length === 2 && first === 'guide') return second ?? null;
  return null;
}

export default function HelpCenterWildcardRoute() {
  return null;
}
