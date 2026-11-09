import { cmsClient } from '~/constants/cms-client';
import { fetchCmsWithFallback } from '~/utils/cms-fetch';

import { type PostSummary } from './posts-index.utils';

const postSummariesQuery = `*[
  _type == "post" && defined(slug.current) && status == "published"
] | order(publishedAt desc) {
  _id, title, "slug": slug.current, summary, category, publishedAt
}`;

const guideSlugsQuery = `*[_type == "helpCenterGuide" && defined(slug.current)].slug.current`;

export function fetchPostSummaries() {
  return fetchCmsWithFallback<PostSummary[]>(
    signal => cmsClient.fetch<PostSummary[]>(postSummariesQuery, {}, { signal }),
    []
  );
}

export function fetchGuideSlugs() {
  return fetchCmsWithFallback<string[]>(
    signal => cmsClient.fetch<string[]>(guideSlugsQuery, {}, { signal }),
    []
  );
}
