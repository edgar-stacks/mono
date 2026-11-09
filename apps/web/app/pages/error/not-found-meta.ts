import { type MetaDescriptor } from 'react-router';

export function notFoundMeta() {
  return [
    { title: '404 – Leather' },
    { name: 'description', content: `The page you're looking for doesn't exist` },
  ] satisfies MetaDescriptor[];
}
