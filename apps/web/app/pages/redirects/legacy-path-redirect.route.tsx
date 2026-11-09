import { NotFoundErrorBoundary } from '~/pages/error/not-found-error-boundary';

import { type Route } from './+types/legacy-path-redirect.route';
import { permanentRedirect, redirectContentSlug, throwNotFound } from './content-slug-loader';
import { getLegacyPathRedirect } from './legacy-path-redirects';

export function loader({ request }: Route.LoaderArgs) {
  const legacyRedirect = getLegacyPathRedirect(new URL(request.url).pathname);
  if (!legacyRedirect) return throwNotFound();
  if ('slug' in legacyRedirect) return redirectContentSlug(legacyRedirect.slug, request);
  return permanentRedirect(legacyRedirect.to, request);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <NotFoundErrorBoundary error={error} />;
}
