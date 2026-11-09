import { isRouteErrorResponse } from 'react-router';

import { ErrorLayout } from '~/features/error/error-layout';

import { NotFound } from './not-found';

const notFoundStatuses = [404, 410];

interface NotFoundErrorBoundaryProps {
  error: unknown;
}

export function NotFoundErrorBoundary({ error }: NotFoundErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && notFoundStatuses.includes(error.status)) return <NotFound />;
  return <ErrorLayout error={error} />;
}
