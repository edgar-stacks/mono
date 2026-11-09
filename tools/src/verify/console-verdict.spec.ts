import { describe, expect, test } from 'vitest';

import { type ConsoleEntry, unexpectedConsoleErrors } from './console-verdict.js';

function entry(overrides: Partial<ConsoleEntry>): ConsoleEntry {
  return {
    source: 'console',
    type: 'error',
    text: 'boom',
    url: 'chrome-extension://x',
    ...overrides,
  };
}

describe(unexpectedConsoleErrors.name, () => {
  const allowlist = [
    { pattern: /^Failed to load resource/, reason: 'aborted by the fallback mock' },
  ];

  test('keeps errors and page errors that no rule allows', () => {
    const entries = [
      entry({ type: 'log', text: 'hello' }),
      entry({ type: 'warning', text: 'careful' }),
      entry({ text: 'Failed to load resource: net::ERR_FAILED' }),
      entry({ text: 'Unexpected token' }),
      entry({ source: 'pageerror', type: 'error', text: 'TypeError: x is undefined' }),
    ];
    expect(unexpectedConsoleErrors(entries, allowlist).map(item => item.text)).toEqual([
      'Unexpected token',
      'TypeError: x is undefined',
    ]);
  });

  test('a rule with a location only allows messages from a matching source', () => {
    const rules = [
      { pattern: /status of 404/, location: /\/v1\/tokens\/sip10s\//, reason: 'mocked 404' },
    ];
    const text = 'Failed to load resource: the server responded with a status of 404 (Not Found)';
    const entries = [
      entry({ text, location: 'https://api.leather.io/v1/tokens/sip10s/SP1.token' }),
      entry({ text, location: 'https://api.leather.io/v1/market/prices' }),
      entry({ text }),
    ];
    expect(unexpectedConsoleErrors(entries, rules).map(item => item.location)).toEqual([
      'https://api.leather.io/v1/market/prices',
      undefined,
    ]);
  });

  test('an empty allowlist keeps every error', () => {
    expect(unexpectedConsoleErrors([entry({})], [])).toHaveLength(1);
  });
});
