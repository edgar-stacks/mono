import { type Route } from './+types/help-center-wildcard.route';
import { parseHelpCenterSplat } from './legacy-section-paths';
import { legacySectionRedirect } from './legacy-section-redirect';

export async function loader({ params, request }: Route.LoaderArgs) {
  throw await legacySectionRedirect(parseHelpCenterSplat(params['*']), request);
}
