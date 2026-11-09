// @ts-ignore
import bigListOfNaughtyStrings from 'blns';

import { isString } from '@leather.io/utils';

import { getOriginFromUrl, isValidUrl } from './urls';

describe('isValidUrl', () => {
  test('accepts normal URLs', () => {
    const normal = [
      'http://example.com',
      'https://blockstack.com/asdf?hey=true',
      'https://blockstack.org/asdf#anchor',
    ];

    normal.forEach(url => {
      expect(isValidUrl(url)).toEqual(true);
    });
  });

  test('rejects non http(s) schemas', () => {
    // one of the strings is a actual url
    const allNaughtyStrings: unknown = bigListOfNaughtyStrings;
    const naughtyStrings = (Array.isArray(allNaughtyStrings) ? allNaughtyStrings : [])
      .filter(isString)
      .filter(str => !str.startsWith('http'));
    const bad = [
      ...naughtyStrings,
      'javascript:alert("hello")//',
      'web.org',
      'javascript:console.log();',
      'javascripT:console.log();',
      'JaVascRipt:console.log();',
    ];

    bad.forEach(url => {
      expect(isValidUrl(url)).toEqual(false);
    });
  });
});

describe('getOriginFromUrl', () => {
  test('returns the canonical origin for web URLs', () => {
    expect(getOriginFromUrl('http://example.com')).toBe('http://example.com');
    expect(getOriginFromUrl('https://blockstack.org/asdf#anchor')).toBe('https://blockstack.org');
    expect(getOriginFromUrl('https://example.com:443/path')).toBe('https://example.com');
    expect(getOriginFromUrl('http://example.com:80/path?q=1')).toBe('http://example.com');
    expect(getOriginFromUrl('HTTPS://Sub.Leather.IO/')).toBe('https://sub.leather.io');
  });

  test('keeps the scheme and a non-default port', () => {
    expect(getOriginFromUrl('https://app.example.com:8443/path')).toBe(
      'https://app.example.com:8443'
    );
    expect(getOriginFromUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(getOriginFromUrl('https://localhost:8080')).toBe('https://localhost:8080');
    expect(getOriginFromUrl('http://app.example.com')).not.toBe(
      getOriginFromUrl('https://app.example.com')
    );
  });

  test('throws for non-web URLs', () => {
    const invalidUrls = [
      'about:blank',
      'javascript:void(0)',
      'data:text/html,<p>hi</p>',
      'file:////path/name',
      'chrome-extension://abcdef/index.html',
      'not-a-url',
      'http://',
      'localhost:3000',
      'app.example.com',
    ];

    invalidUrls.forEach(url => {
      expect(() => getOriginFromUrl(url)).toThrowError();
    });
  });
});
