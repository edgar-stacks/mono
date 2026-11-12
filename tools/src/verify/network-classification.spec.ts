import { describe, expect, test } from 'vitest';

import {
  type ObservedRequest,
  classifyRequest,
  classifyRequests,
  countByClass,
  realRequestReasons,
} from './network-classification.js';

function request(url: string, overrides: Partial<ObservedRequest> = {}): ObservedRequest {
  return { url, method: 'GET', resourceType: 'fetch', ...overrides };
}

describe(classifyRequest.name, () => {
  test('sorts requests by where they were answered', () => {
    expect(classifyRequest(request('chrome-extension://id/index.html'))).toBe('extension');
    expect(classifyRequest(request('http://localhost:3000/'))).toBe('local');
    expect(classifyRequest(request('http://127.0.0.1:8000/'))).toBe('local');
    expect(
      classifyRequest(
        request('https://api.hiro.so/v2/info', { outcome: { source: 'mock', action: 'fulfill' } })
      )
    ).toBe('mocked');
    expect(
      classifyRequest(
        request('https://api.hiro.so/x', { outcome: { source: 'mock', action: 'abort' } })
      )
    ).toBe('mocked');
    expect(
      classifyRequest(
        request('https://cdn.example/x.png', {
          outcome: { source: 'fallback', action: 'fulfill' },
        })
      )
    ).toBe('fallback');
    expect(
      classifyRequest(
        request('https://example.com/x', {
          outcome: { source: 'fallback', action: 'abort' },
          failure: 'net::ERR_FAILED',
        })
      )
    ).toBe('fallback');
    expect(
      classifyRequest(
        request('https://api.hiro.so/x', { outcome: { source: 'mock', action: 'continue' } })
      )
    ).toBe('real');
    expect(classifyRequest(request('https://example.com/', { status: 200 }))).toBe('real');
    expect(classifyRequest(request('https://example.com/', { failure: 'net::ERR_NAME' }))).toBe(
      'failed'
    );
    expect(classifyRequest(request('data:image/png;base64,AAAA'))).toBe('other');
    expect(classifyRequest(request('not a url'))).toBe('other');
  });
});

describe(realRequestReasons.name, () => {
  const requests = classifyRequests([
    request('https://example.com/a', { method: 'POST' }),
    request('chrome-extension://id/a.js'),
  ]);

  test('fails real requests under mocks but not without them', () => {
    expect(realRequestReasons(requests, 'default')).toEqual([
      "real request under mocks: POST https://example.com/a reached the network; mock it or add it to the entry's mocks",
    ]);
    expect(realRequestReasons(requests, 'list')).toHaveLength(1);
    expect(realRequestReasons(requests, 'none')).toEqual([]);
  });

  test('counts every class', () => {
    expect(countByClass(requests)).toEqual({
      extension: 1,
      local: 0,
      mocked: 0,
      fallback: 0,
      real: 1,
      failed: 0,
      other: 0,
    });
  });
});
