import {
  escapeXml,
  getSitemapPaths,
  renderRobotsTxt,
  renderSitemapXml,
  staticSitemapPaths,
} from './sitemap.utils';

const emptyContent = { postSlugs: [], guideSlugs: [], changelogSlugs: [] };

describe(getSitemapPaths.name, () => {
  it('lists the marketing pages', () => {
    expect(getSitemapPaths(emptyContent)).toEqual(staticSitemapPaths);
  });

  it('lists posts and guides at their canonical paths', () => {
    const paths = getSitemapPaths({
      ...emptyContent,
      postSlugs: ['what-is-stacks'],
      guideSlugs: ['install-leather'],
    });
    expect(paths).toContain('/posts/what-is-stacks');
    expect(paths).toContain('/support/install-leather');
  });

  it('lists a slug that is both a guide and a post only under /support', () => {
    const paths = getSitemapPaths({
      ...emptyContent,
      postSlugs: ['install-leather'],
      guideSlugs: ['install-leather'],
    });
    expect(paths).toContain('/support/install-leather');
    expect(paths).not.toContain('/posts/install-leather');
  });

  it('leaves off deprecated slugs, which redirect', () => {
    const paths = getSitemapPaths({
      ...emptyContent,
      postSlugs: ['send-ordinals', 'deprecation-of-ordinals-inscriptions-support-in-leather'],
      guideSlugs: ['receive-ordinals'],
    });
    expect(paths).not.toContain('/posts/send-ordinals');
    expect(paths).not.toContain('/support/receive-ordinals');
    expect(paths).toContain('/posts/deprecation-of-ordinals-inscriptions-support-in-leather');
  });

  it('lists published changelog entries', () => {
    const paths = getSitemapPaths({ ...emptyContent, changelogSlugs: ['web-portfolio'] });
    expect(paths).toContain('/changelog/web-portfolio');
  });

  it('encodes slugs with reserved characters', () => {
    const paths = getSitemapPaths({ ...emptyContent, postSlugs: ['what-are-bns-names?'] });
    expect(paths).toContain('/posts/what-are-bns-names%3F');
  });

  it('does not repeat a path', () => {
    const paths = getSitemapPaths({ ...emptyContent, postSlugs: ['fast-pool', 'fast-pool'] });
    expect(paths.filter(path => path === '/posts/fast-pool')).toHaveLength(1);
  });
});

describe(renderSitemapXml.name, () => {
  it('lists absolute https://leather.io URLs', () => {
    const xml = renderSitemapXml(['/', '/posts/what-is-stacks']);
    const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
    expect(locations).toEqual(['https://leather.io/', 'https://leather.io/posts/what-is-stacks']);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('escapes XML characters', () => {
    expect(renderSitemapXml(["/posts/a&b'c"])).toContain(
      '<loc>https://leather.io/posts/a&amp;b&apos;c</loc>'
    );
  });
});

describe(escapeXml.name, () => {
  it('escapes every reserved character', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;'
    );
  });
});

describe(renderRobotsTxt.name, () => {
  it('allows crawling and points at the sitemap', () => {
    const robots = renderRobotsTxt();
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap: https://leather.io/sitemap.xml');
  });
});
