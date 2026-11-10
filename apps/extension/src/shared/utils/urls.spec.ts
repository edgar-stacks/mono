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
    const urls = [
      'http://example.com',
      'https://leather.io/',
      'https://blockstack.org/asdf?hey=true#anchor',
      'https://Subdomain.Leather.io',
      'https://example.com:443/path',
      'http://example.com:80',
      'http://localhost:3000/page',
      'https://app.example.com:8443',
    ];

    const expected = [
      'http://example.com',
      'https://leather.io',
      'https://blockstack.org',
      'https://subdomain.leather.io',
      'https://example.com',
      'http://example.com',
      'http://localhost:3000',
      'https://app.example.com:8443',
    ];

    urls.forEach((url, index) => expect(getOriginFromUrl(url)).toEqual(expected[index]));
  });

  test('keeps the scheme and port apart for one hostname', () => {
    const origins = [
      'https://app.example.com',
      'http://app.example.com',
      'https://app.example.com:8443',
    ].map(getOriginFromUrl);

    expect(new Set(origins).size).toBe(3);
  });

  test('throws for invalid and non-web URLs', () => {
    const invalidUrls = [
      'not-a-url',
      'file:////path/name',
      'http://',
      'localhost:3000',
      'app.example.com',
      'about:blank',
      'javascript:void(0)',
      'data:text/html,hello',
      'chrome-extension://abcdef/index.html',
      'null',
    ];

    invalidUrls.forEach(url => {
      expect(() => getOriginFromUrl(url)).toThrowError();
    });
  });
});
