import {
  buildSitemapEntries,
  escapeXml,
  renderRobotsTxt,
  renderSitemapXml,
  staticSitemapPaths,
} from './sitemap.utils';

const content = {
  guides: [{ slug: 'install-leather' }, { slug: 'send-ordinals' }],
  posts: [
    { slug: 'what-is-stacks', updatedAt: '2025-01-02T10:00:00Z' },
    { slug: 'install-leather' },
    { slug: 'bitcoin-runes' },
  ],
  changelogEntries: [{ slug: 'web-portfolio' }],
};

describe(buildSitemapEntries.name, () => {
  it('lists the static marketing and content index paths', async () => {
    const paths = (await buildSitemapEntries(content)).map(entry => entry.path);
    expect(paths).toEqual(expect.arrayContaining(staticSitemapPaths));
  });

  it('lists guides and posts at their canonical paths only', async () => {
    const paths = (await buildSitemapEntries(content)).map(entry => entry.path);
    expect(paths).toContain('/support/install-leather');
    expect(paths).toContain('/posts/what-is-stacks');
    expect(paths).not.toContain('/posts/install-leather');
  });

  it('leaves out slugs that redirect', async () => {
    const paths = (await buildSitemapEntries(content)).map(entry => entry.path);
    expect(paths).not.toContain('/support/send-ordinals');
    expect(paths).not.toContain('/posts/bitcoin-runes');
  });

  it('lists published changelog entries', async () => {
    const paths = (await buildSitemapEntries(content)).map(entry => entry.path);
    expect(paths).toContain('/changelog/web-portfolio');
  });

  it('lists every path once', async () => {
    const paths = (await buildSitemapEntries(content)).map(entry => entry.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe(renderSitemapXml.name, () => {
  it('renders absolute leather.io URLs', () => {
    const xml = renderSitemapXml([{ path: '/' }, { path: '/posts/what-is-stacks' }]);
    expect(xml).toContain('<loc>https://leather.io/</loc>');
    expect(xml).toContain('<loc>https://leather.io/posts/what-is-stacks</loc>');
  });

  it('renders the last modified date', () => {
    const xml = renderSitemapXml([{ path: '/posts/a', lastModified: '2025-01-02T10:00:00Z' }]);
    expect(xml).toContain('<lastmod>2025-01-02</lastmod>');
  });

  it('escapes XML special characters', () => {
    const xml = renderSitemapXml([{ path: '/posts/a&b' }]);
    expect(xml).toContain('https://leather.io/posts/a&amp;b');
  });

  it('only lists https://leather.io URLs', async () => {
    const xml = renderSitemapXml(await buildSitemapEntries(content));
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1]);
    expect(locs.length).toBeGreaterThan(0);
    locs.forEach(loc => expect(loc.startsWith('https://leather.io/')).toBe(true));
  });
});

describe(escapeXml.name, () => {
  it('escapes every XML entity', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;'
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
