import { isRouteErrorResponse } from 'react-router';

import { ErrorLayout } from '~/features/error/error-layout';
import { NotFound } from '~/pages/error/not-found';

import type { Route } from '../../../.react-router/types/app/+types/root';

const notFoundStatuses = [404, 410];

interface ErrorPageProps {
  error: Route.ErrorBoundaryProps['error'];
}

export function ErrorPage({ error }: ErrorPageProps) {
  if (isRouteErrorResponse(error) && notFoundStatuses.includes(error.status)) return <NotFound />;
  return <ErrorLayout error={error} />;
}
