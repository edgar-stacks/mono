import { NotFoundErrorBoundary } from '~/pages/error/not-found-error-boundary';

import { type Route } from './+types/help-center-wildcard.route';
import { permanentRedirect, redirectContentSlug, throwNotFound } from './content-slug-loader';

const guideSegment = 'guide';
const searchSegment = 'search';

function getHelpCenterSlug(segments: string[]) {
  if (segments.length === 1) return segments[0];
  if (segments.length === 2 && segments[0] === guideSegment) return segments[1];
  return null;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const segments = (params['*'] ?? '').split('/').filter(Boolean);

  if (segments.length === 0) return permanentRedirect('/support', request);
  if (segments.length === 1 && segments[0] === searchSegment)
    return permanentRedirect('/support/search', request);

  const slug = getHelpCenterSlug(segments);
  if (!slug) return throwNotFound();
  return redirectContentSlug(slug, request);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <NotFoundErrorBoundary error={error} />;
}
