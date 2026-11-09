import { type Route } from './+types/content-slug-redirect.route';
import { contentResolutionResponse, sanityContentFetchers } from './content-slug-loader';
import { resolveContentSlug } from './content-slug-resolver';

export async function loader({ params, request }: Route.LoaderArgs) {
  const resolution = await resolveContentSlug(params.slug, sanityContentFetchers);
  throw contentResolutionResponse(resolution, request);
}
