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
    expect(getOriginFromUrl('http://example.com')).toEqual('http://example.com');
    expect(getOriginFromUrl('https://leather.io/')).toEqual('https://leather.io');
    expect(getOriginFromUrl('https://blockstack.org/asdf?hey=true#anchor')).toEqual(
      'https://blockstack.org'
    );
    expect(getOriginFromUrl('https://SubDomain.Leather.io/path')).toEqual(
      'https://subdomain.leather.io'
    );
  });

  test('drops the default port and keeps any other port', () => {
    expect(getOriginFromUrl('https://example.com:443/path')).toEqual('https://example.com');
    expect(getOriginFromUrl('http://example.com:80')).toEqual('http://example.com');
    expect(getOriginFromUrl('https://example.com:8443/path')).toEqual('https://example.com:8443');
    expect(getOriginFromUrl('http://localhost:3000')).toEqual('http://localhost:3000');
  });

  test('keeps the scheme so http and https origins of one hostname differ', () => {
    expect(getOriginFromUrl('http://app.example.com')).not.toEqual(
      getOriginFromUrl('https://app.example.com')
    );
  });

  test('throws for URLs that are not http or https', () => {
    const invalidUrls = [
      'not-a-url',
      'localhost:3000',
      'http://',
      'file:////path/name',
      'about:blank',
      'javascript:void(0)',
      'data:text/html,<p>hello</p>',
      'chrome-extension://abcdefghijklmnop/index.html',
    ];

    invalidUrls.forEach(url => {
      expect(() => getOriginFromUrl(url)).toThrowError();
    });
  });
});
