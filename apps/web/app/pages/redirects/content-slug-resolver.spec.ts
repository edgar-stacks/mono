import {
  type ContentFetchers,
  getLegacyContentTarget,
  resolveContentSlug,
} from './content-slug-resolver';
import { legacyContentRedirects, retiredContentSlugs } from './legacy-content-redirects';
import { legacyContentPathSlugs, legacyPathRedirects, legacyPaths } from './legacy-path-redirects';
import { deprecationPostSlugs, getDeprecationTarget } from './shared-redirect-logic';

interface FakeDocument {
  slug: string;
}

function createFetchers({
  guides = [],
  posts = [],
}: {
  guides?: string[];
  posts?: string[];
}): ContentFetchers<FakeDocument, FakeDocument> {
  return {
    fetchGuide: vi.fn((slug: string) => Promise.resolve(guides.includes(slug) ? { slug } : null)),
    fetchPost: vi.fn((slug: string) => Promise.resolve(posts.includes(slug) ? { slug } : null)),
  };
}

const noContent = createFetchers({});

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

  it('redirects deprecated slugs before asking Sanity', async () => {
    const fetchers = createFetchers({ guides: ['send-ordinals'], posts: ['send-ordinals'] });
    const resolution = await resolveContentSlug('send-ordinals', fetchers);
    expect(resolution).toEqual({
      kind: 'redirect',
      path: '/posts/deprecation-of-ordinals-inscriptions-support-in-leather',
    });
    expect(fetchers.fetchGuide).not.toHaveBeenCalled();
    expect(fetchers.fetchPost).not.toHaveBeenCalled();
  });

  it('serves Sanity content before consulting the legacy map', async () => {
    const resolution = await resolveContentSlug(
      'apps-xlink',
      createFetchers({ posts: ['apps-xlink'] })
    );
    expect(resolution.kind).toBe('post');
  });

  it('redirects a legacy slug Sanity does not know', async () => {
    expect(await resolveContentSlug('apps-xlink', noContent)).toEqual({
      kind: 'redirect',
      path: '/posts/brotocol',
    });
    expect(await resolveContentSlug('send-stacks-from-app', noContent)).toEqual({
      kind: 'redirect',
      path: '/support/send-stx',
    });
  });

  it.each([
    'befi-labs',
    'apps-befi-labs',
    'apps-lockstacks',
    'stx20-com',
    'apps-stx20-com',
    'tokens-stx-20',
    'tokens-btc',
  ])('marks retired slug %s as gone', async slug => {
    expect(await resolveContentSlug(slug, noContent)).toEqual({ kind: 'gone' });
  });

  it('returns not-found for an unknown slug', async () => {
    expect(await resolveContentSlug('no-such-post', noContent)).toEqual({ kind: 'not-found' });
  });

  it.each(['', ' ', 'a/b', 'constructor', 'toString'])(
    'returns not-found for slug %j',
    async slug => {
      expect(await resolveContentSlug(slug, noContent)).toEqual({ kind: 'not-found' });
    }
  );

  it('encodes reserved characters in the canonical path', async () => {
    const slug = 'what-are-bns-names-(.btc-names)-in-stacks?';
    const resolution = await resolveContentSlug(slug, createFetchers({ posts: [slug] }));
    expect(resolution).toMatchObject({
      kind: 'post',
      path: '/posts/what-are-bns-names-(.btc-names)-in-stacks%3F',
    });
  });
});

describe('legacy redirect maps', () => {
  const legacyTargets = Object.values(legacyContentRedirects);
  const finalFixedPaths = ['/', '/support', '/posts', '/developers'];

  function slugFromContentPath(path: string) {
    const match = /^\/(posts|support)\/([^/]+)$/.exec(path);
    return match?.[2] ?? null;
  }

  it('every legacy target is a final URL', () => {
    for (const target of [...legacyTargets, ...Object.values(legacyPathRedirects)]) {
      const slug = slugFromContentPath(target);
      if (slug === null) {
        expect(finalFixedPaths, target).toContain(target);
        continue;
      }
      expect(getDeprecationTarget(slug), target).toBeNull();
      expect(getLegacyContentTarget(slug), target).toBeNull();
      expect(retiredContentSlugs, target).not.toContain(slug);
      expect(legacyPaths, target).not.toContain(target);
    }
  });

  it('every deprecation target is a final URL', () => {
    for (const slug of deprecationPostSlugs) {
      expect(getDeprecationTarget(slug)).toBeNull();
      expect(getLegacyContentTarget(slug)).toBeNull();
    }
  });

  it('no fixed legacy path redirects to another legacy path', () => {
    for (const target of Object.values(legacyPathRedirects)) {
      expect(legacyPaths).not.toContain(target);
    }
  });

  it('every legacy content path resolves through a slug the resolver knows', async () => {
    for (const slug of Object.values(legacyContentPathSlugs)) {
      const resolution = await resolveContentSlug(
        slug,
        createFetchers({ posts: ['privacy-policy', 'terms-of-service'], guides: ['security'] })
      );
      expect(['guide', 'post', 'redirect'], slug).toContain(resolution.kind);
    }
  });

  it('keeps retired slugs out of the redirect map', () => {
    for (const slug of retiredContentSlugs) {
      expect(getLegacyContentTarget(slug)).toBeNull();
    }
  });

  it('strips trailing slashes from legacy paths', () => {
    for (const path of legacyPaths) {
      expect(path === '/' || !path.endsWith('/')).toBe(true);
    }
  });
});
