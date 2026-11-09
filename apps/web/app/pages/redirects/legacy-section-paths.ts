export type LegacySectionPathResult =
  | { kind: 'redirect'; path: string }
  | { kind: 'slug'; slug: string }
  | { kind: 'not-found' };

function splitSplat(splat: string | undefined) {
  if (!splat) return [];
  return splat.split('/').filter(segment => segment !== '');
}

export function parseHelpCenterSplat(splat: string | undefined): LegacySectionPathResult {
  const segments = splitSplat(splat);
  const [first, second] = segments;

  if (!first) return { kind: 'redirect', path: '/support' };
  if (segments.length === 1 && first === 'search') {
    return { kind: 'redirect', path: '/support/search' };
  }
  if (segments.length === 1) return { kind: 'slug', slug: first };
  if (segments.length === 2 && first === 'guide' && second) return { kind: 'slug', slug: second };
  return { kind: 'not-found' };
}

export function parseGuidesSplat(splat: string | undefined): LegacySectionPathResult {
  const segments = splitSplat(splat);
  const [first] = segments;

  if (!first) return { kind: 'redirect', path: '/support' };
  if (segments.length === 1) return { kind: 'slug', slug: first };
  return { kind: 'not-found' };
}
