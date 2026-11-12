import { type MetaDescriptor, isRouteErrorResponse } from 'react-router';

const notFoundStatuses = [404, 410];

export function isNotFoundErrorResponse(error: unknown) {
  return isRouteErrorResponse(error) && notFoundStatuses.includes(error.status);
}

export function notFoundMeta() {
  return [
    { title: '404 – Leather' },
    {
      name: 'description',
      content: `The page you're looking for doesn't exist`,
    },
  ] satisfies MetaDescriptor[];
}
