import { describe, expect, test } from 'vitest';

import { allowRuleFor, consoleFindings } from './console-verdict.js';

const allowlist = [
  { pattern: 'Failed to load resource', reason: 'aborted by mockUnhandledRequests' },
  { pattern: /^Warning: /, reason: 'React dev warnings' },
];

describe(allowRuleFor.name, () => {
  test('matches substrings and regular expressions', () => {
    expect(allowRuleFor('Failed to load resource: net::ERR_FAILED', allowlist)?.reason).toBe(
      'aborted by mockUnhandledRequests'
    );
    expect(allowRuleFor('Warning: key', allowlist)?.reason).toBe('React dev warnings');
    expect(allowRuleFor('TypeError: x is undefined', allowlist)).toBeUndefined();
  });
});

describe(consoleFindings.name, () => {
  const consoleEntries = [
    { page: 'popup', type: 'error', text: 'TypeError: boom', location: 'index.js:1' },
    { page: 'popup', type: 'error', text: 'Failed to load resource: net::ERR_FAILED' },
    { page: 'popup', type: 'warning', text: 'deprecated' },
  ];
  const pageErrors = [
    { page: 'popup', message: 'ReferenceError: y' },
    { page: 'popup', message: 'Warning: allowed' },
  ];

  test('reports page errors and console errors outside the allowlist', () => {
    expect(
      consoleFindings({ consoleEntries, pageErrors, allowlist, allowConsoleErrors: false })
    ).toEqual([
      { kind: 'page-error', message: 'popup: ReferenceError: y' },
      { kind: 'console-error', message: 'popup: TypeError: boom (index.js:1)' },
    ]);
  });

  test('matches rules against the text and the location', () => {
    const scoped = [{ pattern: /status of 404 .*\(https:\/\/api\.example\.com\//, reason: 'mock' }];
    const entries = [
      { page: 'p', type: 'error', text: 'status of 404', location: 'https://api.example.com/x:0' },
      {
        page: 'p',
        type: 'error',
        text: 'status of 404',
        location: 'https://other.example.com/x:0',
      },
    ];
    expect(
      consoleFindings({
        consoleEntries: entries,
        pageErrors: [],
        allowlist: scoped,
        allowConsoleErrors: false,
      })
    ).toEqual([
      { kind: 'console-error', message: 'p: status of 404 (https://other.example.com/x:0)' },
    ]);
  });

  test('--allow-console-errors keeps page errors only', () => {
    expect(
      consoleFindings({ consoleEntries, pageErrors, allowlist, allowConsoleErrors: true })
    ).toEqual([{ kind: 'page-error', message: 'popup: ReferenceError: y' }]);
  });
});
