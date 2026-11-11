import { isWebUri } from 'valid-url';

const webProtocols = ['http:', 'https:'];

export function isValidUrl(str: string) {
  return !!isWebUri(str);
}

export function getOriginFromUrl(value: string) {
  const url = new URL(value);
  if (!webProtocols.includes(url.protocol)) throw new Error('Invalid web URL: ' + value);
  return url.origin;
}
