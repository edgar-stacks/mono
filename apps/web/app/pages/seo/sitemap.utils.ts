import { getGuidePath, getPostPath } from '~/pages/redirects/content-slug-resolver';
import { isDeprecatedContentSlug } from '~/pages/redirects/shared-redirect-logic';

import { toAbsoluteUrl } from './marketing-meta';

const staticSitemapPaths = [
  '/',
  '/apps',
  '/developers',
  '/news',
  '/explorer',
  '/posts',
  '/support',
  '/changelog',
];

export interface SitemapContent {
  postSlugs: string[];
  guideSlugs: string[];
  changelogSlugs: string[];
}

export function getSitemapPaths({ postSlugs, guideSlugs, changelogSlugs }: SitemapContent) {
  const servedGuideSlugs = guideSlugs.filter(slug => !isDeprecatedContentSlug(slug));
  const guideSlugSet = new Set(servedGuideSlugs);
  const servedPostSlugs = postSlugs.filter(
    slug => !isDeprecatedContentSlug(slug) && !guideSlugSet.has(slug)
  );

  return [
    ...new Set([
      ...staticSitemapPaths,
      ...servedGuideSlugs.map(getGuidePath),
      ...servedPostSlugs.map(getPostPath),
      ...changelogSlugs.map(slug => `/changelog/${encodeURIComponent(slug)}`),
    ]),
  ];
}

const xmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => xmlEntities[character] ?? character);
}

export function buildSitemapXml(paths: string[]) {
  const urls = paths
    .map(path => `  <url><loc>${escapeXml(toAbsoluteUrl(path))}</loc></url>`)
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}
