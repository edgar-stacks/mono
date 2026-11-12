import { type Route } from './+types/help-center-redirect.route';
import { permanentRedirect } from './content-slug-response';

export function loader({ request }: Route.LoaderArgs) {
  throw permanentRedirect(request, '/support');
}
