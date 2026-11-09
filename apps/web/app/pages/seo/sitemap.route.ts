import { cmsClient } from '~/constants/cms-client';
import { fetchCmsWithFallback } from '~/utils/cms-fetch-with-fallback';

import { seoFileCacheControl } from './seo-cache';
import { type SitemapContent, buildSitemapXml, getSitemapPaths } from './sitemap.utils';

const sitemapContentQuery = `{
  "postSlugs": *[_type == "post" && status == "published" && defined(slug.current)].slug.current,
  "guideSlugs": *[_type == "helpCenterGuide" && defined(slug.current)].slug.current,
  "changelogSlugs": *[_type == "changelog" && publishedAt <= now() && defined(slug.current)].slug.current
}`;

const emptySitemapContent: SitemapContent = { postSlugs: [], guideSlugs: [], changelogSlugs: [] };

export async function loader() {
  const content = await fetchCmsWithFallback(
    signal => cmsClient.fetch<SitemapContent>(sitemapContentQuery, {}, { signal }),
    emptySitemapContent
  );

  return new Response(buildSitemapXml(getSitemapPaths(content)), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': seoFileCacheControl,
    },
  });
}
