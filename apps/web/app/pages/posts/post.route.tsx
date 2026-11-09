import { Post } from '~/pages/posts/post';
import {
  contentResolutionResponse,
  sanityContentFetchers,
} from '~/pages/redirects/content-slug-loader';
import { resolveContentSlug } from '~/pages/redirects/content-slug-resolver';
import { marketingMeta } from '~/pages/seo/marketing-meta';

import { type PostBySlugQueryResult } from '@leather.io/cms';

import { type Route } from './+types/post.route';

interface PostLoaderData {
  post: NonNullable<PostBySlugQueryResult>;
  path: string;
}

export async function loader({ params, request }: Route.LoaderArgs): Promise<PostLoaderData> {
  const resolution = await resolveContentSlug(params.postSlug, sanityContentFetchers);

  if (resolution.kind !== 'post') throw contentResolutionResponse(resolution, request);

  return { post: resolution.post, path: resolution.path };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { post, path } = loaderData;
  return marketingMeta({ title: post.title, path, description: post.summary });
}

export default function PostRoute() {
  return <Post />;
}
