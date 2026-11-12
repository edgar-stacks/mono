import { type Route } from './+types/legacy-path-redirect.route';
import { sanityContentFetchers } from './content-fetchers';
import { resolveContentSlug } from './content-slug-resolver';
import { contentSlugResponse, notFoundResponse, permanentRedirect } from './content-slug-response';
import { getLegacyContentPathSlug, getLegacyPathTarget } from './legacy-path-redirects';

export async function loader({ request }: Route.LoaderArgs) {
  const { pathname } = new URL(request.url);

  const contentSlug = getLegacyContentPathSlug(pathname);
  if (contentSlug) {
    const resolution = await resolveContentSlug(contentSlug, sanityContentFetchers);
    throw contentSlugResponse(request, resolution);
  }

  const target = getLegacyPathTarget(pathname);
  if (target) throw permanentRedirect(request, target);

  throw notFoundResponse();
}

export default function LegacyPathRedirectRoute() {
  return null;
}
