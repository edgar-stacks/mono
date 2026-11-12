import { cmsClient } from '~/constants/cms-client';

import { seoFileCacheControl } from './cache-control';
import { getSitemapPaths, renderSitemapXml } from './sitemap.utils';

const sitemapContentQuery = `{
  "postSlugs": *[_type == "post" && defined(slug.current)].slug.current,
  "guideSlugs": *[_type == "helpCenterGuide" && defined(slug.current)].slug.current,
  "changelogSlugs": *[
    _type == "changelog" && publishedAt <= now() && defined(slug.current)
  ].slug.current
}`;

interface SitemapContentQueryResult {
  postSlugs: string[] | null;
  guideSlugs: string[] | null;
  changelogSlugs: string[] | null;
}

export async function loader() {
  const content = await cmsClient.fetch<SitemapContentQueryResult>(sitemapContentQuery);
  const paths = getSitemapPaths({
    postSlugs: content.postSlugs ?? [],
    guideSlugs: content.guideSlugs ?? [],
    changelogSlugs: content.changelogSlugs ?? [],
  });
  return new Response(renderSitemapXml(paths), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': seoFileCacheControl,
    },
  });
}
