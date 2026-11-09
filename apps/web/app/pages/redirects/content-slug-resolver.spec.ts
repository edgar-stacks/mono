import {
  type ContentFetchers,
  getResolvedContentPath,
  resolveContentSlug,
} from './content-slug-resolver';
import {
  getLegacyContentTarget,
  getLegacyContentTargets,
  isRetiredContentSlug,
} from './legacy-content-redirects';
import { getLegacyPathRedirect, legacyPathRedirects } from './legacy-path-redirects';
import { getDeprecationTarget } from './shared-redirect-logic';

interface FakeDocument {
  slug: string;
}

function createFakeFetchers({
  guides = [],
  posts = [],
}: {
  guides?: string[];
  posts?: string[];
}): ContentFetchers<FakeDocument, FakeDocument> {
  return {
    fetchGuide(slug) {
      return Promise.resolve(guides.includes(slug) ? { slug } : null);
    },
    fetchPost(slug) {
      return Promise.resolve(posts.includes(slug) ? { slug } : null);
    },
  };
}

const noContent = createFakeFetchers({});

describe(resolveContentSlug.name, () => {
  it('serves a help-center guide', async () => {
    const resolution = await resolveContentSlug(
      'install-leather',
      createFakeFetchers({ guides: ['install-leather'] })
    );

    expect(resolution).toEqual({ kind: 'guide', guide: { slug: 'install-leather' } });
  });

  it('serves a post', async () => {
    const resolution = await resolveContentSlug(
      'what-is-stacks',
      createFakeFetchers({ posts: ['what-is-stacks'] })
    );

    expect(resolution).toEqual({ kind: 'post', post: { slug: 'what-is-stacks' } });
  });

  it('prefers the guide when a post shares its slug', async () => {
    const resolution = await resolveContentSlug(
      'install-leather',
      createFakeFetchers({ guides: ['install-leather'], posts: ['install-leather'] })
    );

    expect(resolution.kind).toBe('guide');
    expect(getResolvedContentPath('install-leather', resolution)).toBe('/support/install-leather');
  });

  it('redirects deprecated slugs before looking at Sanity', async () => {
    const fetchers = createFakeFetchers({ guides: ['send-ordinals'], posts: ['send-ordinals'] });
    const resolution = await resolveContentSlug('send-ordinals', fetchers);

    expect(resolution).toEqual({
      kind: 'redirect',
      to: '/posts/deprecation-of-ordinals-inscriptions-support-in-leather',
    });
  });

  it('redirects legacy slugs that Sanity does not have', async () => {
    const resolution = await resolveContentSlug('apps-xlink', noContent);

    expect(resolution).toEqual({ kind: 'redirect', to: '/posts/brotocol' });
  });

  it('serves Sanity content before the legacy map', async () => {
    const resolution = await resolveContentSlug(
      'apps-xlink',
      createFakeFetchers({ posts: ['apps-xlink'] })
    );

    expect(resolution.kind).toBe('post');
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
    const resolution = await resolveContentSlug(slug, noContent);

    expect(resolution).toEqual({ kind: 'gone' });
    expect(getResolvedContentPath(slug, resolution)).toBeNull();
  });

  it('returns not found for unknown slugs', async () => {
    const resolution = await resolveContentSlug('no-such-post', noContent);

    expect(resolution).toEqual({ kind: 'not-found' });
    expect(getResolvedContentPath('no-such-post', resolution)).toBeNull();
  });

  it('percent-encodes URL-reserved characters in the resolved path', async () => {
    const guideSlug = 'what-are-bns-names-(.btc-names)-in-stacks?';
    const postSlug = 'what-is-sbtc?';
    const fetchers = createFakeFetchers({ guides: [guideSlug], posts: [postSlug] });

    const guideResolution = await resolveContentSlug(guideSlug, fetchers);
    const postResolution = await resolveContentSlug(postSlug, fetchers);

    expect(getResolvedContentPath(guideSlug, guideResolution)).toBe(
      '/support/what-are-bns-names-(.btc-names)-in-stacks%3F'
    );
    expect(getResolvedContentPath(postSlug, postResolution)).toBe('/posts/what-is-sbtc%3F');
  });
});

function getSlugFromContentPath(path: string) {
  const match = /^\/(?:posts|support)\/([^/]+)$/.exec(path);
  return match?.[1] ?? null;
}

describe('legacy redirects', () => {
  it('every legacy target is a final URL', () => {
    const targets = getLegacyContentTargets();

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      const slug = getSlugFromContentPath(target);
      if (!slug) {
        expect(['/', '/support']).toContain(target);
        continue;
      }
      expect(getDeprecationTarget(slug)).toBeNull();
      expect(isRetiredContentSlug(slug)).toBe(false);
      expect(getLegacyContentTarget(slug)).toBeNull();
    }
  });

  it.each(['send-ordinals', 'bitcoin-runes', 'receive-stamps'])(
    'redirects deprecated slug %s to a final URL',
    slug => {
      const deprecationTarget = getDeprecationTarget(slug);
      const targetSlug = deprecationTarget ? getSlugFromContentPath(deprecationTarget) : null;

      expect(targetSlug).not.toBeNull();
      if (targetSlug) expect(getDeprecationTarget(targetSlug)).toBeNull();
    }
  );

  it('every legacy path points at a route that does not redirect again', () => {
    for (const entry of legacyPathRedirects) {
      if ('to' in entry) expect(getLegacyPathRedirect(entry.to)).toBeNull();
    }
  });

  it('matches legacy paths with a trailing slash or capitals', () => {
    expect(getLegacyPathRedirect('/Privacy-Policy/')).toEqual({
      path: '/privacy-policy',
      slug: 'privacy-policy',
    });
    expect(getLegacyPathRedirect('/wallet/mobile/')).toEqual({ path: '/wallet/mobile', to: '/' });
  });

  it('returns null for paths outside the map', () => {
    expect(getLegacyPathRedirect('/old-page/unknown')).toBeNull();
  });
});
