import { cmsClient } from '~/constants/cms-client';

import {
  type HelpCenterGuideBySlugQueryResult,
  type PostBySlugQueryResult,
  helpCenterGuideBySlugQuery,
  postBySlugQuery,
} from '@leather.io/cms';

import { type ContentFetchers } from './content-slug-resolver';

export type ContentGuide = NonNullable<HelpCenterGuideBySlugQueryResult>;
export type ContentPost = NonNullable<PostBySlugQueryResult>;

export const sanityContentFetchers: ContentFetchers<ContentGuide, ContentPost> = {
  fetchGuide(slug) {
    return cmsClient.fetch(helpCenterGuideBySlugQuery, { slug });
  },
  fetchPost(slug) {
    return cmsClient.fetch(postBySlugQuery, { slug });
  },
};
