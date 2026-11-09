import { data } from 'react-router';

import { NotFound } from './not-found';
import { notFoundMeta } from './not-found-meta';

const notFoundStatus = 404;

export function loader() {
  return data(null, { status: notFoundStatus });
}

export function meta() {
  return notFoundMeta();
}

export default function NotFoundRoute() {
  return <NotFound />;
}
