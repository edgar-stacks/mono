type LegacyPathRedirect = { path: string; slug: string } | { path: string; to: string };

function toSlug(paths: string[], slug: string): LegacyPathRedirect[] {
  return paths.map(path => ({ path, slug }));
}

function toPath(paths: string[], to: string): LegacyPathRedirect[] {
  return paths.map(path => ({ path, to }));
}

export const legacyPathRedirects: LegacyPathRedirect[] = [
  ...toSlug(['/privacy-policy', '/old-page/privacy-policy'], 'privacy-policy'),
  ...toSlug(['/terms', '/old-page/terms'], 'terms-of-service'),
  ...toSlug(['/security'], 'security'),
  ...toSlug(['/wallet-apps', '/old-page/wallet-apps'], 'wallets-comparison'),
  ...toPath(
    [
      '/wallet',
      '/wallet/mobile',
      '/wallet/extension',
      '/download',
      '/install',
      '/mobilewaitlist',
      '/install-desktop',
      '/install-extension',
      '/old-page',
      '/old-page/home',
      '/old-page/install-extension',
      '/old-page/install-desktop',
      '/old-page/mobilewaitlist',
    ],
    '/'
  ),
  ...toPath(
    [
      '/contact',
      '/help',
      '/guides',
      '/frequent-questions',
      '/old-page/guides',
      '/old-page/frequent-questions',
      '/old-page/contact',
    ],
    '/support'
  ),
  ...toPath(['/old-page/blog', '/old-page/learn'], '/posts'),
  ...toPath(['/old-page/developer-docs'], '/developers'),
];

function normalizePath(pathname: string) {
  const trimmed = pathname.toLowerCase().replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function getLegacyPathRedirect(pathname: string) {
  const path = normalizePath(pathname);
  return legacyPathRedirects.find(entry => entry.path === path) ?? null;
}
