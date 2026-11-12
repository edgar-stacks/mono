import { ErrorLayout } from '~/features/error/error-layout';
import { NotFound } from '~/pages/error/not-found';
import { isNotFoundErrorResponse } from '~/pages/error/not-found-meta';

import type { Route } from '../../../.react-router/types/app/+types/root';

interface ErrorPageProps {
  error: Route.ErrorBoundaryProps['error'];
}

export function ErrorPage({ error }: ErrorPageProps) {
  if (isNotFoundErrorResponse(error)) return <NotFound />;
  return <ErrorLayout error={error} />;
}
