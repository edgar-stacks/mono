import { data, redirect } from 'react-router';

import { type ContentSlugResolution } from './content-slug-resolver';

const permanentRedirectStatus = 301;
const notFoundStatus = 404;
const goneStatus = 410;

export function permanentRedirect(request: Request, path: string) {
  const { search } = new URL(request.url);
  return redirect(`${path}${search}`, permanentRedirectStatus);
}

export function notFoundResponse() {
  return data(null, { status: notFoundStatus });
}

export function contentSlugResponse<Guide, Post>(
  request: Request,
  resolution: ContentSlugResolution<Guide, Post>
) {
  switch (resolution.kind) {
    case 'gone':
      return data(null, { status: goneStatus });
    case 'not-found':
      return notFoundResponse();
    default:
      return permanentRedirect(request, resolution.path);
  }
}
