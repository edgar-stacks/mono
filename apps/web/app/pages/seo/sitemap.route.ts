import { cmsClient } from '~/constants/cms-client';

import { seoFileCacheControl } from './seo.constants';
import { type SitemapContentDoc, buildSitemapEntries, renderSitemapXml } from './sitemap.utils';

const sitemapContentQuery = `{
  "posts": *[_type == "post" && defined(slug.current) && status == "published"]{
    "slug": slug.current, "updatedAt": _updatedAt
  },
  "guides": *[_type == "helpCenterGuide" && defined(slug.current)]{
    "slug": slug.current, "updatedAt": _updatedAt
  },
  "changelogEntries": *[_type == "changelog" && defined(slug.current) && publishedAt <= now()] | order(publishedAt desc){
    "slug": slug.current, "updatedAt": _updatedAt
  }
}`;

interface SitemapContentResult {
  posts: SitemapContentDoc[];
  guides: SitemapContentDoc[];
  changelogEntries: SitemapContentDoc[];
}

export async function loader() {
  const content = await cmsClient.fetch<SitemapContentResult>(sitemapContentQuery);
  const entries = await buildSitemapEntries(content);

  return new Response(renderSitemapXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': seoFileCacheControl,
    },
  });
}
