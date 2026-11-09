import { buildSitemapXml, escapeXml, getSitemapPaths } from './sitemap.utils';

describe(getSitemapPaths.name, () => {
  it('lists the static marketing pages', () => {
    const paths = getSitemapPaths({ postSlugs: [], guideSlugs: [], changelogSlugs: [] });

    expect(paths).toEqual([
      '/',
      '/apps',
      '/developers',
      '/news',
      '/explorer',
      '/posts',
      '/support',
      '/changelog',
    ]);
  });

  it('lists guides under /support and posts under /posts', () => {
    const paths = getSitemapPaths({
      postSlugs: ['what-is-stacks'],
      guideSlugs: ['install-leather'],
      changelogSlugs: ['web-portfolio'],
    });

    expect(paths).toContain('/support/install-leather');
    expect(paths).toContain('/posts/what-is-stacks');
    expect(paths).toContain('/changelog/web-portfolio');
  });

  it('lists a slug shared by a post and a guide only at its guide path', () => {
    const paths = getSitemapPaths({
      postSlugs: ['install-leather'],
      guideSlugs: ['install-leather'],
      changelogSlugs: [],
    });

    expect(paths).toContain('/support/install-leather');
    expect(paths).not.toContain('/posts/install-leather');
  });

  it('leaves out deprecated slugs that redirect', () => {
    const paths = getSitemapPaths({
      postSlugs: ['send-ordinals', 'deprecation-of-ordinals-inscriptions-support-in-leather'],
      guideSlugs: ['receive-ordinals'],
      changelogSlugs: [],
    });

    expect(paths).not.toContain('/posts/send-ordinals');
    expect(paths).not.toContain('/support/receive-ordinals');
    expect(paths).toContain('/posts/deprecation-of-ordinals-inscriptions-support-in-leather');
  });

  it('percent-encodes slugs with URL-reserved characters', () => {
    const paths = getSitemapPaths({
      postSlugs: ['what-is-sbtc?'],
      guideSlugs: ['what-are-bns-names-(.btc-names)-in-stacks?'],
      changelogSlugs: ['release#2'],
    });

    expect(paths).toContain('/support/what-are-bns-names-(.btc-names)-in-stacks%3F');
    expect(paths).toContain('/posts/what-is-sbtc%3F');
    expect(paths).toContain('/changelog/release%232');
  });

  it('lists each path once', () => {
    const paths = getSitemapPaths({
      postSlugs: ['what-is-stacks', 'what-is-stacks'],
      guideSlugs: [],
      changelogSlugs: [],
    });

    expect(paths.filter(path => path === '/posts/what-is-stacks')).toHaveLength(1);
  });
});

describe(escapeXml.name, () => {
  it('escapes XML special characters', () => {
    expect(escapeXml(`a&b<c>"d"'e'`)).toBe('a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;');
  });
});

describe(buildSitemapXml.name, () => {
  it('lists only absolute https://leather.io URLs', () => {
    const xml = buildSitemapXml(['/', '/posts/what-is-stacks']);
    const locations = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, location]) => location);

    expect(locations).toEqual(['https://leather.io/', 'https://leather.io/posts/what-is-stacks']);
  });

  it('escapes URLs', () => {
    expect(buildSitemapXml(['/posts/a&b'])).toContain(
      '<loc>https://leather.io/posts/a&amp;b</loc>'
    );
  });

  it('produces a sitemap urlset document', () => {
    const xml = buildSitemapXml(['/']);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });
});
