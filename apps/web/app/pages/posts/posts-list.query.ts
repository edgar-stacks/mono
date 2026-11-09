import { cmsClient, urlFor } from '~/constants/cms-client';
import { fetchCmsWithFallback } from '~/utils/cms-fetch-with-fallback';

import { type PostListItem } from './posts-index.utils';

const postListQuery = `{
  "posts": *[_type == "post" && status == "published" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    "summary": coalesce(summary, null),
    "publishedAt": coalesce(publishedAt, null),
    "category": coalesce(category, null),
    "image": images[0]
  },
  "guideSlugs": *[_type == "helpCenterGuide" && defined(slug.current)].slug.current
}`;

const postImageWidth = 800;

interface PostListDocument extends Omit<PostListItem, 'imageUrl'> {
  image: { asset?: { _ref: string } } | null;
}

interface PostListResult {
  posts: PostListDocument[];
  guideSlugs: string[];
}

const emptyPostList: PostListResult = { posts: [], guideSlugs: [] };

function getPostImageUrl(image: PostListDocument['image']) {
  if (!image?.asset?._ref) return null;
  return urlFor(image).width(postImageWidth).auto('format').url();
}

export async function fetchPostList() {
  const { posts, guideSlugs } = await fetchCmsWithFallback(
    signal => cmsClient.fetch<PostListResult>(postListQuery, {}, { signal }),
    emptyPostList
  );

  return {
    posts: posts.map(
      ({ image, ...post }): PostListItem => ({
        ...post,
        imageUrl: getPostImageUrl(image),
      })
    ),
    guideSlugs: new Set(guideSlugs),
  };
}
