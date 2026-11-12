import { notFoundMeta } from '~/pages/error/not-found-meta';
import { Post } from '~/pages/posts/post';
import { type ContentPost, sanityContentFetchers } from '~/pages/redirects/content-fetchers';
import { postPath, resolveContentSlug } from '~/pages/redirects/content-slug-resolver';
import { contentSlugResponse } from '~/pages/redirects/content-slug-response';
import { marketingHeaders } from '~/pages/seo/cache-control';
import { marketingMeta } from '~/pages/seo/marketing-meta';

import { type Route } from './+types/post.route';

export function meta({ data, params }: Route.MetaArgs) {
  if (!data) return notFoundMeta();
  return marketingMeta({
    title: `${data.post.title} – Leather`,
    path: postPath(params.postSlug),
    description: data.post.summary,
  });
}

export function headers() {
  return marketingHeaders();
}

export async function loader({
  params,
  request,
}: Route.LoaderArgs): Promise<{ post: ContentPost }> {
  const resolution = await resolveContentSlug(params.postSlug, sanityContentFetchers);
  if (resolution.kind === 'post') return { post: resolution.post };
  throw contentSlugResponse(request, resolution);
}

export default function PostRoute() {
  return <Post />;
}
