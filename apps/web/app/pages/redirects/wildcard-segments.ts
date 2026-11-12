export function getWildcardSegments(splat: string | undefined) {
  return (splat ?? '').split('/').filter(segment => segment.length > 0);
}
