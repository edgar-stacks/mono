import { describe, expect, test } from 'vitest';

import {
  classifyNetworkRequest,
  classifyNetworkRequests,
  networkFindings,
} from './network-classification.js';

function request(url: string, extra: object = {}) {
  return { url, method: 'GET', resourceType: 'fetch', ...extra };
}

describe(classifyNetworkRequest.name, () => {
  test('classifies by origin first', () => {
    expect(classifyNetworkRequest(request('chrome-extension://abc/index.html'))).toBe('extension');
    expect(classifyNetworkRequest(request('http://localhost:3000/'))).toBe('local');
    expect(classifyNetworkRequest(request('http://127.0.0.1:8080/x', { tag: 'real' }))).toBe(
      'local'
    );
    expect(classifyNetworkRequest(request('data:image/png;base64,AAAA'))).toBe('other');
    expect(classifyNetworkRequest(request('not a url'))).toBe('other');
  });

  test('uses the route tag for web requests', () => {
    const url = 'https://api.hiro.so/extended/v1/address/x/balances';
    expect(classifyNetworkRequest(request(url))).toBe('mocked');
    expect(classifyNetworkRequest(request(url, { tag: 'fallback', failure: 'aborted' }))).toBe(
      'fallback'
    );
    expect(classifyNetworkRequest(request(url, { tag: 'real' }))).toBe('real');
    expect(classifyNetworkRequest(request(url, { tag: 'real', failure: 'net::ERR' }))).toBe('real');
    expect(classifyNetworkRequest(request(url, { failure: 'net::ERR_FAILED' }))).toBe('failed');
  });
});

describe(networkFindings.name, () => {
  const requests = classifyNetworkRequests([
    request('https://api.hiro.so/a'),
    request('https://real.example.com/b', { tag: 'real' }),
  ]);

  test('fails a real request while mocks are on', () => {
    expect(networkFindings(requests, true)).toEqual([
      {
        kind: 'real-request',
        message:
          'GET https://real.example.com/b reached the real network although mocks are on; register a mock for it or run with --mocks none',
      },
    ]);
  });

  test('accepts real requests under --mocks none', () => {
    expect(networkFindings(requests, false)).toEqual([]);
  });
});
