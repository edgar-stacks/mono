import { cmsClient } from '~/constants/cms-client';
import { withFallback } from '~/utils/with-fallback';

import { type IndexPost } from './posts-index.utils';

const indexPostProjection = `{
  _id,
  title,
  "slug": slug.current,
  category,
  summary,
  publishedAt
}`;

const postsIndexQuery = `{
  "posts": *[
    _type == "post" && defined(slug.current) && status != "draft" && hidden != true
  ] | order(publishedAt desc) ${indexPostProjection},
  "guideSlugs": *[_type == "helpCenterGuide" && defined(slug.current)].slug.current
}`;

const newsPostsQuery = `*[
  _type == "post" && category == "News" && defined(slug.current) && status != "draft" && hidden != true
] | order(publishedAt desc) ${indexPostProjection}`;

interface PostsIndexQueryResult {
  posts: IndexPost[];
  guideSlugs: string[];
}

const emptyPostsIndex: PostsIndexQueryResult = { posts: [], guideSlugs: [] };

export function fetchPostsIndex() {
  return withFallback(cmsClient.fetch<PostsIndexQueryResult>(postsIndexQuery), emptyPostsIndex);
}

export function fetchNewsPosts() {
  return withFallback(cmsClient.fetch<IndexPost[]>(newsPostsQuery), []);
}
