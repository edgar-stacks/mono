import { NotFoundErrorBoundary } from '~/pages/error/not-found-error-boundary';
import { notFoundMeta } from '~/pages/error/not-found-meta';
import { Post } from '~/pages/posts/post';
import {
  type CmsPost,
  resolveCmsContentSlug,
  throwForContentResolution,
} from '~/pages/redirects/content-slug-loader';
import { getPostPath } from '~/pages/redirects/content-slug-resolver';
import { marketingCacheHeaders, marketingMeta } from '~/pages/seo/marketing-meta';

import { type Route } from './+types/post.route';

export async function loader({ params, request }: Route.LoaderArgs): Promise<{ post: CmsPost }> {
  const slug = params.postSlug;
  const resolution = await resolveCmsContentSlug(slug);
  if (resolution.kind === 'post') return { post: resolution.post };
  return throwForContentResolution(slug, resolution, request);
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return notFoundMeta();
  const { post } = loaderData;
  return marketingMeta({
    title: post.title,
    path: getPostPath(post.slug.current),
    description: post.summary,
  });
}

export function headers() {
  return marketingCacheHeaders;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <NotFoundErrorBoundary error={error} />;
}

export default function PostRoute() {
  return <Post />;
}
