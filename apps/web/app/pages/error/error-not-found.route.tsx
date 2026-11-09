import { type MetaDescriptor, data } from 'react-router';

import { NotFound } from './not-found';

const notFoundStatus = 404;

export function loader() {
  return data(null, { status: notFoundStatus });
}

export function meta() {
  return [
    { title: '404 – Leather' },
    {
      name: 'description',
      content: `The page you're looking for doesn't exist`,
    },
  ] satisfies MetaDescriptor[];
}

export default function NotFoundRoute() {
  return <NotFound />;
}
