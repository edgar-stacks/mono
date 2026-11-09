import { NotFoundErrorBoundary } from '~/pages/error/not-found-error-boundary';

import { type Route } from './+types/guides-wildcard.route';
import { permanentRedirect, redirectContentSlug, throwNotFound } from './content-slug-loader';

export async function loader({ params, request }: Route.LoaderArgs) {
  const segments = (params['*'] ?? '').split('/').filter(Boolean);

  if (segments.length === 0) return permanentRedirect('/support', request);
  if (segments.length !== 1) return throwNotFound();
  return redirectContentSlug(segments[0], request);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <NotFoundErrorBoundary error={error} />;
}
