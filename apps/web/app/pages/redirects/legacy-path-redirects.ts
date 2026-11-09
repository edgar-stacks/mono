import { type LegacySectionPathResult } from './legacy-section-paths';

export const legacyPathContentSlugs: Readonly<Record<string, string>> = {
  '/privacy-policy': 'privacy-policy',
  '/old-page/privacy-policy': 'privacy-policy',
  '/terms': 'terms-of-service',
  '/old-page/terms': 'terms-of-service',
  '/security': 'security',
  '/wallet-apps': 'wallets-comparison',
  '/old-page/wallet-apps': 'wallets-comparison',
};

export const legacyPathTargets: Readonly<Record<string, string>> = {
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
  ...Object.keys(legacyPathContentSlugs),
  ...Object.keys(legacyPathTargets),
];

function normalizeLegacyPath(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function parseLegacyPath(pathname: string): LegacySectionPathResult {
  const path = normalizeLegacyPath(pathname);
  const target = legacyPathTargets[path];
  if (target) return { kind: 'redirect', path: target };
  const slug = legacyPathContentSlugs[path];
  if (slug) return { kind: 'slug', slug };
  return { kind: 'not-found' };
}
