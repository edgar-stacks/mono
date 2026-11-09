import { type Route } from './+types/legacy-path-redirect.route';
import { parseLegacyPath } from './legacy-path-redirects';
import { legacySectionRedirect } from './legacy-section-redirect';

export async function loader({ request }: Route.LoaderArgs) {
  throw await legacySectionRedirect(parseLegacyPath(new URL(request.url).pathname), request);
}
