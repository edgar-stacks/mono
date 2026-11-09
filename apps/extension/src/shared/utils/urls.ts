import { isWebUri } from 'valid-url';

const webProtocols = ['http:', 'https:'];

export function isValidUrl(str: string) {
  return !!isWebUri(str);
}

export function getOriginFromUrl(url: string) {
  const { origin, protocol } = new URL(url);
  if (!webProtocols.includes(protocol)) throw new Error('Invalid web URL: ' + url);
  return origin;
}
