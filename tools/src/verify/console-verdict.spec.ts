import { describe, expect, test } from 'vitest';

import {
  type CapturedConsoleMessage,
  consoleErrorReasons,
  consoleVerdict,
} from './console-verdict.js';

const allowlist = [
  { pattern: /^Failed to load resource: net::ERR_FAILED$/, reason: 'fallback aborts' },
  {
    pattern: /status of 404/,
    url: /\/v1\/tokens\//,
    reason: 'mocked 404',
  },
];

function consoleError(text: string, url?: string): CapturedConsoleMessage {
  return { source: 'console', type: 'error', text, url };
}
const pageError: CapturedConsoleMessage = {
  source: 'pageerror',
  type: 'error',
  text: 'TypeError: x is undefined',
  url: 'chrome-extension://id/index.html',
};
const warning: CapturedConsoleMessage = { source: 'console', type: 'warning', text: 'careful' };

describe(consoleVerdict.name, () => {
  test('blocks errors that are not allowlisted and ignores warnings', () => {
    const messages = [
      consoleError('Failed to load resource: net::ERR_FAILED'),
      consoleError(
        'Failed to load resource: the server responded with a status of 404',
        'https://api/v1/tokens/x'
      ),
      consoleError(
        'Failed to load resource: the server responded with a status of 404',
        'https://api/v1/other'
      ),
      pageError,
      warning,
    ];
    const verdict = consoleVerdict(messages, allowlist, { allowConsoleErrors: false });
    expect(verdict.allowlisted.map(message => message.reason)).toEqual([
      'fallback aborts',
      'mocked 404',
    ]);
    expect(verdict.blocking).toEqual([messages[2], pageError]);
    expect(verdict.tolerated).toEqual([]);
  });

  test('--allow-console-errors tolerates console errors but not page errors', () => {
    const verdict = consoleVerdict([consoleError('boom'), pageError], allowlist, {
      allowConsoleErrors: true,
    });
    expect(verdict.blocking).toEqual([pageError]);
    expect(verdict.tolerated).toEqual([consoleError('boom')]);
  });
});

describe(consoleErrorReasons.name, () => {
  test('names the kind and origin and truncates long text', () => {
    const verdict = consoleVerdict([pageError, consoleError('x'.repeat(400))], [], {
      allowConsoleErrors: false,
    });
    const reasons = consoleErrorReasons(verdict);
    expect(reasons[0]).toBe(
      'page error on chrome-extension://id/index.html: TypeError: x is undefined'
    );
    expect(reasons[1]).toBe(`console error: ${'x'.repeat(300)}…`);
  });
});
