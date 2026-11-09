import { NotFoundErrorBoundary } from '~/pages/error/not-found-error-boundary';

import { type Route } from './+types/support-guide-redirect.route';
import { redirectContentSlug } from './content-slug-loader';

export function loader({ params, request }: Route.LoaderArgs) {
  return redirectContentSlug(params.slug, request);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <NotFoundErrorBoundary error={error} />;
}
