import { isWebUri } from 'valid-url';

const webProtocols = ['http:', 'https:'];

export function isValidUrl(str: string) {
  return !!isWebUri(str);
}

export function getOriginFromUrl(url: string) {
  const parsed = new URL(url);
  if (!webProtocols.includes(parsed.protocol)) throw new Error('Invalid web URL: ' + url);
  return parsed.origin;
}
