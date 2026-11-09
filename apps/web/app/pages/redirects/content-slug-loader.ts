import { data, redirect } from 'react-router';

import { cmsClient } from '~/constants/cms-client';

import {
  type HelpCenterGuideBySlugQueryResult,
  type PostBySlugQueryResult,
  helpCenterGuideBySlugQuery,
  postBySlugQuery,
} from '@leather.io/cms';

import {
  type ContentFetchers,
  type ContentSlugResolution,
  getResolvedContentPath,
  resolveContentSlug,
} from './content-slug-resolver';

const permanentRedirectStatus = 301;
const notFoundStatus = 404;
const goneStatus = 410;

export type CmsGuide = NonNullable<HelpCenterGuideBySlugQueryResult>;
export type CmsPost = NonNullable<PostBySlugQueryResult>;
type CmsContentSlugResolution = ContentSlugResolution<CmsGuide, CmsPost>;

const cmsContentFetchers: ContentFetchers<CmsGuide, CmsPost> = {
  fetchGuide(slug) {
    return cmsClient.fetch(helpCenterGuideBySlugQuery, { slug });
  },
  fetchPost(slug) {
    return cmsClient.fetch(postBySlugQuery, { slug });
  },
};

export function resolveCmsContentSlug(slug: string): Promise<CmsContentSlugResolution> {
  return resolveContentSlug(slug, cmsContentFetchers);
}

export function throwNotFound(): never {
  throw data(null, { status: notFoundStatus });
}

export function permanentRedirect(path: string, request: Request) {
  return redirect(`${path}${new URL(request.url).search}`, permanentRedirectStatus);
}

export function throwForContentResolution(
  slug: string,
  resolution: CmsContentSlugResolution,
  request: Request
): never {
  const path = getResolvedContentPath(slug, resolution);
  if (path) throw permanentRedirect(path, request);
  if (resolution.kind === 'gone') throw data(null, { status: goneStatus });
  return throwNotFound();
}

export async function redirectContentSlug(slug: string, request: Request): Promise<never> {
  const resolution = await resolveCmsContentSlug(slug);
  return throwForContentResolution(slug, resolution, request);
}
