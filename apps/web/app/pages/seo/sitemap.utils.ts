import { guidePath, postPath } from '~/pages/redirects/content-slug-resolver';
import { getDeprecationTarget } from '~/pages/redirects/shared-redirect-logic';

import { canonicalUrl } from './marketing-meta';

export const staticSitemapPaths = [
  '/',
  '/apps',
  '/developers',
  '/news',
  '/explorer',
  '/posts',
  '/support',
  '/changelog',
];

interface SitemapContent {
  postSlugs: string[];
  guideSlugs: string[];
  changelogSlugs: string[];
}

function servesAtCanonicalPath(slug: string) {
  return slug.trim().length > 0 && !slug.includes('/') && !getDeprecationTarget(slug);
}

export function getSitemapPaths({ postSlugs, guideSlugs, changelogSlugs }: SitemapContent) {
  const servedGuideSlugs = guideSlugs.filter(servesAtCanonicalPath);
  const guideSlugSet = new Set(servedGuideSlugs);
  const servedPostSlugs = postSlugs.filter(
    slug => servesAtCanonicalPath(slug) && !guideSlugSet.has(slug)
  );
  const paths = [
    ...staticSitemapPaths,
    ...servedPostSlugs.map(postPath),
    ...servedGuideSlugs.map(guidePath),
    ...changelogSlugs
      .filter(slug => slug.trim().length > 0)
      .map(slug => `/changelog/${encodeURIComponent(slug)}`),
  ];
  return [...new Set(paths)];
}

const xmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => xmlEscapes[character] ?? character);
}

export function renderSitemapXml(paths: string[]) {
  const urls = paths
    .map(path => `  <url>\n    <loc>${escapeXml(canonicalUrl(path))}</loc>\n  </url>`)
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}

export function renderRobotsTxt() {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${canonicalUrl('/sitemap.xml')}`, ''].join(
    '\n'
  );
}
