import { getLegacyContentPathSlug, getLegacyPathTarget } from './legacy-path-redirects';

describe(getLegacyPathTarget.name, () => {
  it.each([
    ['/wallet/mobile', '/'],
    ['/install', '/'],
    ['/contact', '/support'],
    ['/old-page/blog', '/posts'],
    ['/old-page/developer-docs', '/developers'],
  ])('redirects %s to %s', (path, target) => {
    expect(getLegacyPathTarget(path)).toBe(target);
  });

  it('ignores trailing slashes and case', () => {
    expect(getLegacyPathTarget('/Wallet/Mobile/')).toBe('/');
  });

  it('returns null for unknown paths', () => {
    expect(getLegacyPathTarget('/old-page/unknown')).toBeNull();
    expect(getLegacyPathTarget('/constructor')).toBeNull();
  });
});

describe(getLegacyContentPathSlug.name, () => {
  it.each([
    ['/privacy-policy', 'privacy-policy'],
    ['/old-page/terms', 'terms-of-service'],
    ['/security/', 'security'],
    ['/wallet-apps', 'wallets-comparison'],
  ])('resolves %s through slug %s', (path, slug) => {
    expect(getLegacyContentPathSlug(path)).toBe(slug);
  });

  it('returns null for paths that are not content', () => {
    expect(getLegacyContentPathSlug('/wallet')).toBeNull();
  });
});
