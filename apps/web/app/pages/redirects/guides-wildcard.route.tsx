import { type Route } from './+types/guides-wildcard.route';
import { parseGuidesSplat } from './legacy-section-paths';
import { legacySectionRedirect } from './legacy-section-redirect';

export async function loader({ params, request }: Route.LoaderArgs) {
  throw await legacySectionRedirect(parseGuidesSplat(params['*']), request);
}
