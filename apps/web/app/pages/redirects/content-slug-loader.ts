import { data, redirect } from 'react-router';

import { cmsClient } from '~/constants/cms-client';

import {
  type HelpCenterGuideBySlugQueryResult,
  type PostBySlugQueryResult,
  helpCenterGuideBySlugQuery,
  postBySlugQuery,
} from '@leather.io/cms';

import { type ContentFetchers, type ContentSlugResolution } from './content-slug-resolver';

type Guide = NonNullable<HelpCenterGuideBySlugQueryResult>;
type Post = NonNullable<PostBySlugQueryResult>;

const permanentRedirectStatus = 301;
const notFoundStatus = 404;
const goneStatus = 410;

export const sanityContentFetchers: ContentFetchers<Guide, Post> = {
  async fetchGuide(slug) {
    return cmsClient.fetch(helpCenterGuideBySlugQuery, { slug });
  },
  async fetchPost(slug) {
    return cmsClient.fetch(postBySlugQuery, { slug });
  },
};

export function permanentRedirect(path: string, request: Request) {
  const { search } = new URL(request.url);
  return redirect(`${path}${search}`, permanentRedirectStatus);
}

export function notFound() {
  return data(null, { status: notFoundStatus });
}

export function contentResolutionResponse(
  resolution: ContentSlugResolution<unknown, unknown>,
  request: Request
) {
  if (resolution.kind === 'gone') return data(null, { status: goneStatus });
  if (resolution.kind === 'not-found') return notFound();
  return permanentRedirect(resolution.path, request);
}
