import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, test } from 'vitest';

import { fakeGitHub } from './fake-github.js';
import { GitHubError } from './github.js';
import { fetchIssue } from './issue.js';
import { type TestRepo, createTestRepo } from './test-repo.js';

const openIssue = {
  title: 'Fee row overflows on narrow popups',
  html_url: 'https://github.com/leather-io/mono/issues/12',
  state: 'open',
  body: 'The fee row wraps out of view.',
  created_at: '2026-11-01T10:00:00Z',
  user: { login: 'reporter' },
  labels: [{ name: 'bug' }, { name: 'platform:extension' }],
};

const comment = {
  body: 'Seen on 360px too.',
  created_at: '2026-11-02T09:00:00Z',
  user: { login: 'carol' },
};

describe('fetchIssue', () => {
  let repo: TestRepo;
  afterEach(() => repo.cleanup());

  function fetch(issue: unknown, comments: unknown[] = []) {
    const client = fakeGitHub((method, path) => {
      if (path === 'repos/leather-io/mono/issues/12') {
        if (issue === null) throw new GitHubError(404, 'Not Found');
        return issue;
      }
      if (path.startsWith('repos/leather-io/mono/issues/12/comments')) return comments;
      return undefined;
    });
    return fetchIssue({
      client,
      repo: 'leather-io/mono',
      issue: 12,
      outFile: repo.paths.issueFile,
    });
  }

  test('renders the issue and its comments', async () => {
    repo = createTestRepo();
    await expect(fetch(openIssue, [comment])).resolves.toBe(1);
    expect(readFileSync(repo.paths.issueFile, 'utf8')).toBe(
      [
        '# Fee row overflows on narrow popups',
        '',
        'https://github.com/leather-io/mono/issues/12',
        '',
        'Labels: bug, platform:extension',
        'Opened by @reporter on 2026-11-01T10:00:00Z',
        '',
        '## Body',
        '',
        'The fee row wraps out of view.',
        '',
        '## Comments',
        '',
        '### @carol on 2026-11-02T09:00:00Z',
        '',
        'Seen on 360px too.',
        '',
      ].join('\n')
    );
  });

  test('says when there is no body, label or comment', async () => {
    repo = createTestRepo();
    await fetch({ ...openIssue, body: null, labels: [] });
    const text = readFileSync(repo.paths.issueFile, 'utf8');
    expect(text).toMatch(/Labels: none/);
    expect(text).toMatch(/## Body\n\n\(empty\)/);
    expect(text).toMatch(/## Comments\n\nnone\n$/);
  });

  test.each([
    ['a missing issue', null, 'issue #12 was not found in leather-io/mono'],
    ['a pull request', { ...openIssue, pull_request: {} }, '#12 is a pull request, not an issue'],
    ['a closed issue', { ...openIssue, state: 'closed' }, 'issue #12 is closed'],
  ])('refuses %s', async (_name, issue, message) => {
    repo = createTestRepo();
    await expect(fetch(issue)).rejects.toThrow(message);
  });
});
