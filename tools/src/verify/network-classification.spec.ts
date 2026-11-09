import { describe, expect, test } from 'vitest';

import { classifyRequest, countRequestClasses } from './network-classification.js';

const fallback = 'mockUnhandledRequests';

describe(classifyRequest.name, () => {
  test('classifies every kind of request', () => {
    expect(classifyRequest({ url: 'chrome-extension://abc/index.html' }, fallback)).toBe(
      'extension'
    );
    expect(classifyRequest({ url: 'http://localhost:3000/' }, fallback)).toBe('local');
    expect(
      classifyRequest(
        {
          url: 'https://api.hiro.so/v2/info',
          handling: { handler: 'setupMockApis', action: 'fulfill' },
        },
        fallback
      )
    ).toBe('mocked');
    expect(
      classifyRequest(
        { url: 'https://example.com/a', handling: { handler: fallback, action: 'abort' } },
        fallback
      )
    ).toBe('fallback');
    expect(classifyRequest({ url: 'https://example.com/a' }, fallback)).toBe('real');
    expect(
      classifyRequest(
        {
          url: 'https://example.com/a',
          handling: { handler: 'setupMockApis', action: 'continue' },
          failure: 'net::ERR_NAME_NOT_RESOLVED',
        },
        fallback
      )
    ).toBe('failed');
    expect(classifyRequest({ url: 'data:image/png;base64,AA' }, fallback)).toBe('other');
    expect(classifyRequest({ url: 'not a url' }, fallback)).toBe('other');
  });
});

describe(countRequestClasses.name, () => {
  test('counts each class including the absent ones', () => {
    expect(countRequestClasses(['real', 'mocked', 'mocked'])).toEqual({
      extension: 0,
      local: 0,
      mocked: 2,
      fallback: 0,
      real: 1,
      failed: 0,
      other: 0,
    });
  });
});
