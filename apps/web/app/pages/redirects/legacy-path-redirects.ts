export const legacyContentPathSlugs: Record<string, string> = {
  '/privacy-policy': 'privacy-policy',
  '/old-page/privacy-policy': 'privacy-policy',
  '/terms': 'terms-of-service',
  '/old-page/terms': 'terms-of-service',
  '/security': 'security',
  '/wallet-apps': 'wallets-comparison',
  '/old-page/wallet-apps': 'wallets-comparison',
};

export const legacyPathRedirects: Record<string, string> = {
  '/wallet': '/',
  '/wallet/mobile': '/',
  '/wallet/extension': '/',
  '/download': '/',
  '/install': '/',
  '/mobilewaitlist': '/',
  '/install-desktop': '/',
  '/install-extension': '/',
  '/old-page': '/',
  '/old-page/home': '/',
  '/old-page/install-extension': '/',
  '/old-page/install-desktop': '/',
  '/old-page/mobilewaitlist': '/',
  '/contact': '/support',
  '/help': '/support',
  '/guides': '/support',
  '/frequent-questions': '/support',
  '/old-page/guides': '/support',
  '/old-page/frequent-questions': '/support',
  '/old-page/contact': '/support',
  '/old-page/blog': '/posts',
  '/old-page/learn': '/posts',
  '/old-page/developer-docs': '/developers',
};

export const legacyPaths = [
  ...Object.keys(legacyContentPathSlugs),
  ...Object.keys(legacyPathRedirects),
];

function normalizeLegacyPath(pathname: string) {
  const lowerCased = pathname.toLowerCase();
  if (lowerCased.length > 1 && lowerCased.endsWith('/')) return lowerCased.replace(/\/+$/, '');
  return lowerCased;
}

export function getLegacyContentPathSlug(pathname: string) {
  const path = normalizeLegacyPath(pathname);
  if (!Object.hasOwn(legacyContentPathSlugs, path)) return null;
  return legacyContentPathSlugs[path] ?? null;
}

export function getLegacyPathTarget(pathname: string) {
  const path = normalizeLegacyPath(pathname);
  if (!Object.hasOwn(legacyPathRedirects, path)) return null;
  return legacyPathRedirects[path] ?? null;
}
