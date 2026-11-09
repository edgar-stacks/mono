import {
  type ContentFetchers,
  getLegacyContentTarget,
  resolveContentSlug,
} from './content-slug-resolver';
import { legacyContentRedirects, retiredContentSlugs } from './legacy-content-redirects';
import {
  legacyPathContentSlugs,
  legacyPathTargets,
  parseLegacyPath,
} from './legacy-path-redirects';
import { parseGuidesSplat, parseHelpCenterSplat } from './legacy-section-paths';
import { deprecationPostSlugs, getDeprecationTarget } from './shared-redirect-logic';

interface FakeDoc {
  slug: string;
}

function createFetchers({
  guides = [],
  posts = [],
}: {
  guides?: string[];
  posts?: string[];
}): ContentFetchers<FakeDoc, FakeDoc> & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fetchGuide(slug) {
      calls.push(`guide:${slug}`);
      return Promise.resolve(guides.includes(slug) ? { slug } : null);
    },
    fetchPost(slug) {
      calls.push(`post:${slug}`);
      return Promise.resolve(posts.includes(slug) ? { slug } : null);
    },
  };
}

const finalStaticPaths = ['/', '/support', '/posts', '/developers'];

function getContentSlug(path: string) {
  return /^\/(?:posts|support)\/([^/]+)$/.exec(path)?.[1] ?? null;
}

describe(resolveContentSlug.name, () => {
  it('serves a guide at its canonical support path', async () => {
    const resolution = await resolveContentSlug(
      'install-leather',
      createFetchers({ guides: ['install-leather'] })
    );
    expect(resolution).toEqual({
      kind: 'guide',
      path: '/support/install-leather',
      guide: { slug: 'install-leather' },
    });
  });

  it('serves a post at its canonical posts path', async () => {
    const resolution = await resolveContentSlug(
      'what-is-stacks',
      createFetchers({ posts: ['what-is-stacks'] })
    );
    expect(resolution).toEqual({
      kind: 'post',
      path: '/posts/what-is-stacks',
      post: { slug: 'what-is-stacks' },
    });
  });

  it('prefers the guide when a post shares the slug', async () => {
    const resolution = await resolveContentSlug(
      'install-leather',
      createFetchers({ guides: ['install-leather'], posts: ['install-leather'] })
    );
    expect(resolution.kind).toBe('guide');
  });

  it('applies the deprecation map before looking up content', async () => {
    const fetchers = createFetchers({ guides: ['send-ordinals'], posts: ['send-ordinals'] });
    const resolution = await resolveContentSlug('send-ordinals', fetchers);
    expect(resolution).toEqual({
      kind: 'redirect',
      path: '/posts/deprecation-of-ordinals-inscriptions-support-in-leather',
    });
    expect(fetchers.calls).toEqual([]);
  });

  it('serves content from Sanity before consulting the legacy map', async () => {
    const resolution = await resolveContentSlug(
      'apps-xlink',
      createFetchers({ posts: ['apps-xlink'] })
    );
    expect(resolution.kind).toBe('post');
  });

  it('redirects legacy slugs that Sanity does not have', async () => {
    const resolution = await resolveContentSlug('apps-xlink', createFetchers({}));
    expect(resolution).toEqual({ kind: 'redirect', path: '/posts/brotocol' });
  });

  it.each([
    'befi-labs',
    'apps-befi-labs',
    'apps-lockstacks',
    'stx20-com',
    'apps-stx20-com',
    'tokens-stx-20',
    'tokens-btc',
  ])('marks %s as gone', async slug => {
    expect(await resolveContentSlug(slug, createFetchers({}))).toEqual({ kind: 'gone' });
  });

  it('returns not found for unknown slugs', async () => {
    expect(await resolveContentSlug('no-such-post', createFetchers({}))).toEqual({
      kind: 'not-found',
    });
  });
});

describe('legacy content map', () => {
  it('maps every retired slug to gone and nothing else', () => {
    retiredContentSlugs.forEach(slug => expect(getLegacyContentTarget(slug)).toBeNull());
  });

  it('every legacy target is a final URL', () => {
    Object.values(legacyContentRedirects).forEach(target => {
      const slug = getContentSlug(target);
      if (!slug) {
        expect(finalStaticPaths).toContain(target);
        return;
      }
      expect(getDeprecationTarget(slug)).toBeNull();
      expect(getLegacyContentTarget(slug)).toBeNull();
      expect(retiredContentSlugs).not.toContain(slug);
    });
  });

  it('every deprecation target is a final URL', () => {
    deprecationPostSlugs.forEach(slug => {
      expect(getDeprecationTarget(slug)).toBeNull();
      expect(getLegacyContentTarget(slug)).toBeNull();
    });
  });
});

describe(parseLegacyPath.name, () => {
  it.each([
    ['/wallet', '/'],
    ['/wallet/mobile', '/'],
    ['/wallet/extension/', '/'],
    ['/download', '/'],
    ['/contact', '/support'],
    ['/guides', '/support'],
    ['/old-page/blog', '/posts'],
    ['/old-page/developer-docs', '/developers'],
  ])('redirects %s to %s', (path, target) => {
    expect(parseLegacyPath(path)).toEqual({ kind: 'redirect', path: target });
  });

  it.each([
    ['/privacy-policy', 'privacy-policy'],
    ['/terms/', 'terms-of-service'],
    ['/old-page/terms', 'terms-of-service'],
    ['/security', 'security'],
    ['/wallet-apps', 'wallets-comparison'],
  ])('resolves %s through the content slug %s', (path, slug) => {
    expect(parseLegacyPath(path)).toEqual({ kind: 'slug', slug });
  });

  it('returns not found for unknown paths', () => {
    expect(parseLegacyPath('/old-page/unknown')).toEqual({ kind: 'not-found' });
  });

  it('only targets final static paths', () => {
    Object.values(legacyPathTargets).forEach(target => {
      expect(finalStaticPaths).toContain(target);
    });
  });

  it('never registers a path in both maps', () => {
    Object.keys(legacyPathContentSlugs).forEach(path => {
      expect(legacyPathTargets[path]).toBeUndefined();
    });
  });
});

describe(parseHelpCenterSplat.name, () => {
  it.each([
    ['', { kind: 'redirect', path: '/support' }],
    ['/', { kind: 'redirect', path: '/support' }],
    ['search', { kind: 'redirect', path: '/support/search' }],
    ['install-leather', { kind: 'slug', slug: 'install-leather' }],
    ['guide/install-leather', { kind: 'slug', slug: 'install-leather' }],
    ['a/b', { kind: 'not-found' }],
    ['guide/a/b', { kind: 'not-found' }],
  ])('parses "%s"', (splat, expected) => {
    expect(parseHelpCenterSplat(splat)).toEqual(expected);
  });
});

describe(parseGuidesSplat.name, () => {
  it.each([
    ['', { kind: 'redirect', path: '/support' }],
    ['send-stacks-from-app', { kind: 'slug', slug: 'send-stacks-from-app' }],
    ['a/b', { kind: 'not-found' }],
  ])('parses "%s"', (splat, expected) => {
    expect(parseGuidesSplat(splat)).toEqual(expected);
  });
});
