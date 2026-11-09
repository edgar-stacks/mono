import { resolveContentSlug } from '~/pages/redirects/content-slug-resolver';

import { toAbsoluteUrl } from './seo.constants';

export interface SitemapContentDoc {
  slug: string;
  updatedAt?: string | null;
}

interface SitemapContent {
  posts: SitemapContentDoc[];
  guides: SitemapContentDoc[];
  changelogEntries: SitemapContentDoc[];
}

interface SitemapEntry {
  path: string;
  lastModified?: string | null;
}

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

function createInMemoryFetchers({ posts, guides }: SitemapContent) {
  const guidesBySlug = new Map(guides.map(guide => [guide.slug, guide]));
  const postsBySlug = new Map(posts.map(post => [post.slug, post]));
  return {
    fetchGuide(slug: string) {
      return Promise.resolve(guidesBySlug.get(slug) ?? null);
    },
    fetchPost(slug: string) {
      return Promise.resolve(postsBySlug.get(slug) ?? null);
    },
  };
}

export async function buildSitemapEntries(content: SitemapContent): Promise<SitemapEntry[]> {
  const fetchers = createInMemoryFetchers(content);
  const contentSlugs = [...new Set([...content.guides, ...content.posts].map(doc => doc.slug))];

  const resolutions = await Promise.all(
    contentSlugs.map(slug => resolveContentSlug(slug, fetchers))
  );
  const contentEntries = resolutions.flatMap((resolution): SitemapEntry[] => {
    if (resolution.kind === 'guide') {
      return [{ path: resolution.path, lastModified: resolution.guide.updatedAt }];
    }
    if (resolution.kind === 'post') {
      return [{ path: resolution.path, lastModified: resolution.post.updatedAt }];
    }
    return [];
  });

  const changelogEntries = content.changelogEntries.map(entry => ({
    path: `/changelog/${entry.slug}`,
    lastModified: entry.updatedAt,
  }));

  return [...staticSitemapPaths.map(path => ({ path })), ...contentEntries, ...changelogEntries];
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatLastModified(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function renderSitemapXml(entries: SitemapEntry[]) {
  const urls = entries.map(({ path, lastModified }) => {
    const lastmod = formatLastModified(lastModified);
    const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
    return `  <url><loc>${escapeXml(toAbsoluteUrl(path))}</loc>${lastmodTag}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

export function renderRobotsTxt() {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${toAbsoluteUrl('/sitemap.xml')}`, ''].join(
    '\n'
  );
}
