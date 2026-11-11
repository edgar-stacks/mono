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
    ];

    const expected = [
      'http://example.com',
      'https://leather.io',
      'https://blockstack.org',
      'https://subdomain.leather.io',
      'https://example.com',
      'http://example.com',
    ];

    urls.forEach((url, index) => expect(getOriginFromUrl(url)).toEqual(expected[index]));
  });

  test('keeps the scheme and a non-default port', () => {
    expect(getOriginFromUrl('http://app.example.com')).toEqual('http://app.example.com');
    expect(getOriginFromUrl('https://app.example.com')).toEqual('https://app.example.com');
    expect(getOriginFromUrl('https://app.example.com:8443/')).toEqual(
      'https://app.example.com:8443'
    );
    expect(getOriginFromUrl('http://localhost:3000')).toEqual('http://localhost:3000');
  });

  test('throws for non-web and invalid URLs', () => {
    const invalidUrls = [
      'about:blank',
      'javascript:void(0)',
      'data:text/html,<p>hi</p>',
      'file:////path/name',
      'chrome-extension://abcdef/index.html',
      'not-a-url',
      'http://',
      'localhost:3000',
    ];

    invalidUrls.forEach(url => {
      expect(() => getOriginFromUrl(url)).toThrowError();
    });
  });
});
