import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const scriptNames = [
  'fix-issue-status.sh',
  'fix-issue-verify.sh',
  'fix-issue-fetch.sh',
  'fix-issue-pr.sh',
  'fix-issue-round.sh',
  'fix-issue-screenshots.sh',
];
const repoName = 'leather-io/mono';
const binaryContent = Buffer.from([0, 1, 2, 255, 254, 0, 10]);

const ghStub = [
  '#!/usr/bin/env node',
  "const fs = require('node:fs');",
  "const crypto = require('node:crypto');",
  'const args = process.argv.slice(2);',
  "const stdin = args.includes('--input') ? fs.readFileSync(0, 'utf8') : '';",
  "const bodyIndex = args.indexOf('--body-file');",
  "const body = bodyIndex === -1 ? undefined : fs.readFileSync(args[bodyIndex + 1], 'utf8');",
  "fs.appendFileSync(process.env.STUB_LOG, JSON.stringify({ args, stdin, body }) + '\\n');",
  "const state = JSON.parse(process.env.STUB_STATE || '{}');",
  "const print = text => { if (text) process.stdout.write(text + '\\n'); };",
  'const [command, sub] = args;',
  "const endpoint = args.find(arg => arg.startsWith('repos/')) || '';",
  "if (command === 'api') {",
  "  if (endpoint.includes('/git/matching-refs/')) print(endpoint.includes('bot/screenshots') ? state.screenshotsSha : state.branchSha);",
  "  else if (endpoint.endsWith('/git/blobs')) {",
  '    const blob = JSON.parse(stdin);',
  "    const bytes = Buffer.from(blob.content, blob.encoding === 'base64' ? 'base64' : 'utf8');",
  "    const header = Buffer.from('blob ' + bytes.length + '\\0');",
  "    print(crypto.createHash('sha1').update(Buffer.concat([header, bytes])).digest('hex'));",
  "  } else if (endpoint.endsWith('/git/trees')) print('new-tree-sha');",
  "  else if (endpoint.endsWith('/git/commits')) print('new-commit-sha');",
  "  else if (endpoint.includes('/git/commits/')) print('base-tree-sha');",
  "  else if (endpoint.includes('/git/refs')) print('');",
  '  else if (/\\/issues\\/\\d+\\/comments$/.test(endpoint)) print(JSON.stringify(state.comments || []));',
  '  else if (/\\/issues\\/\\d+$/.test(endpoint)) {',
  '    if (!state.issue) {',
  '      process.stdout.write(\'{"message":"Not Found"}\');',
  "      process.stderr.write('gh: Not Found (HTTP 404)\\n');",
  '      process.exit(1);',
  '    }',
  '    print(JSON.stringify(state.issue));',
  '  } else process.exit(64);',
  "} else if (command === 'pr' && sub === 'list') print(state.pr);",
  "else if (command === 'pr' && sub === 'create') print('https://github.com/leather-io/mono/pull/101');",
  "else if (command === 'pr' && sub === 'view') print('https://github.com/leather-io/mono/pull/' + args[2]);",
  "else if (command === 'pr' && (sub === 'edit' || sub === 'ready')) print('');",
  "else if (command === 'issue' && sub === 'comment') print('');",
  'else process.exit(64);',
  '',
].join('\n');

const pnpmStub = [
  '#!/usr/bin/env node',
  "const fs = require('node:fs');",
  'const args = process.argv.slice(2);',
  "fs.appendFileSync(process.env.STUB_LOG, JSON.stringify({ args }) + '\\n');",
  "if (args[0] === 'format' && process.env.STUB_FORMAT_WRITES) {",
  "  fs.appendFileSync(process.env.STUB_FORMAT_WRITES, 'reformatted\\n');",
  '}',
  "if (process.env.STUB_PNPM_FAIL && args.join(' ') === process.env.STUB_PNPM_FAIL) process.exitCode = 1;",
  "if (args.includes('playwright') && process.env.REVIEW_SCREENSHOT_DIR) {",
  "  const source = fs.readFileSync(process.cwd() + '/fee-row.tsx', 'utf8');",
  "  fs.appendFileSync(process.env.STUB_LOG, JSON.stringify({ screenshotOf: source }) + '\\n');",
  "  fs.writeFileSync(process.env.REVIEW_SCREENSHOT_DIR + '/fee-row.png', Buffer.from('89504e470d0a1a0a00', 'hex'));",
  '}',
  '',
].join('\n');

const doneStatus = [
  'STATE: done',
  'COMMIT: fix(extension): keep the fee row visible on narrow popups',
  'CLOSES: 12',
  'WHY:',
  '- The fee row wrapped out of view below 360px.',
  'HOW:',
  '- Let the row wrap its label instead of overflowing.',
  'TESTED:',
  '- pnpm --filter @leather.io/extension test:unit',
  '- Not verified: the E2E spec, it needs a built extension.',
  '',
].join('\n');

const blockedStatus = [
  'STATE: blocked',
  'COMMIT: fix(extension): keep the fee row visible on narrow popups',
  'CLOSES: 12',
  'WHY:',
  '- The fee row wrapped out of view below 360px.',
  'QUESTIONS:',
  '- Should the label truncate or wrap? Options: truncate with a tooltip, wrap onto two lines.',
  '',
].join('\n');

const sandboxes = [];

after(() => {
  for (const sandbox of sandboxes) rmSync(sandbox.root, { recursive: true, force: true });
});

function git(sandbox, args) {
  const result = spawnSync('git', args, { cwd: sandbox.repo, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function createSandbox() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fix-issue-spec-')));
  const repo = join(root, 'repo');
  const bin = join(root, 'bin');
  mkdirSync(join(repo, '.github/scripts'), { recursive: true });
  mkdirSync(join(repo, 'apps/extension'), { recursive: true });
  mkdirSync(join(repo, 'packages/utils'), { recursive: true });
  mkdirSync(bin);
  for (const name of scriptNames) {
    copyFileSync(join(scriptsDir, name), join(repo, '.github/scripts', name));
  }
  writeFileSync(join(repo, '.gitignore'), 'tmp/\n');
  writeFileSync(join(repo, 'README.md'), 'readme\n');
  writeFileSync(join(repo, 'apps/extension/fee-row.tsx'), 'export const feeRow = 1;\n');
  writeFileSync(join(repo, 'apps/extension/old.ts'), 'export const old = 1;\n');
  writeFileSync(join(repo, 'packages/utils/run.sh'), 'echo run\n', { mode: 0o755 });
  writeFileSync(join(bin, 'gh'), ghStub, { mode: 0o755 });
  writeFileSync(join(bin, 'pnpm'), pnpmStub, { mode: 0o755 });
  const sandbox = { root, repo, bin };
  git(sandbox, ['init', '-q', '-b', 'dev']);
  git(sandbox, ['add', '-A']);
  git(sandbox, [
    '-c',
    'user.name=spec',
    '-c',
    'user.email=spec@example.com',
    'commit',
    '-q',
    '-m',
    'base',
  ]);
  sandbox.head = git(sandbox, ['rev-parse', 'HEAD']);
  mkdirSync(join(repo, 'tmp/fix-issue'), { recursive: true });
  sandboxes.push(sandbox);
  return sandbox;
}

function writeRepoFile(sandbox, path, content, mode) {
  mkdirSync(dirname(join(sandbox.repo, path)), { recursive: true });
  writeFileSync(join(sandbox.repo, path), content);
  if (mode !== undefined) chmodSync(join(sandbox.repo, path), mode);
}

function writeStatus(sandbox, text) {
  writeFileSync(join(sandbox.repo, 'tmp/fix-issue/status.md'), text);
}

function makeFix(sandbox) {
  writeRepoFile(sandbox, 'apps/extension/fee-row.tsx', 'export const feeRow = 2;\n');
  writeRepoFile(sandbox, 'apps/extension/fee-row.spec.tsx', 'test("wraps", () => {});\n');
  writeRepoFile(sandbox, 'packages/utils/icon.bin', binaryContent);
  unlinkSync(join(sandbox.repo, 'apps/extension/old.ts'));
}

function readCalls(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(line => line !== '')
    .map(line => JSON.parse(line));
}

function run(sandbox, script, { env = {}, state = {}, args = [] } = {}) {
  const logPath = join(sandbox.root, `${script}.calls.log`);
  writeFileSync(logPath, '');
  const result = spawnSync('bash', [`.github/scripts/${script}`, ...args], {
    cwd: sandbox.repo,
    encoding: 'utf8',
    env: {
      PATH: `${sandbox.bin}${delimiter}${process.env.PATH}`,
      HOME: process.env.HOME,
      GITHUB_REPOSITORY: repoName,
      STUB_LOG: logPath,
      STUB_STATE: JSON.stringify(state),
      ...env,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    calls: readCalls(logPath),
  };
}

function runPr(sandbox, options = {}) {
  return run(sandbox, 'fix-issue-pr.sh', {
    state: options.state,
    env: {
      ISSUE: '12',
      BRANCH: 'bot/fix-12',
      BASE_BRANCH: 'dev',
      STATUS_FILE: 'tmp/fix-issue/status.md',
      PARENT_SHA: options.parentSha ?? sandbox.head,
      GITHUB_RUN_ID: '777',
      GITHUB_SERVER_URL: 'https://github.com',
      ...options.env,
    },
  });
}

function findCall(calls, predicate) {
  return calls.find(call => predicate(call.args));
}

function apiCall(calls, suffix) {
  return calls.find(call => call.args[0] === 'api' && call.args.some(arg => arg.endsWith(suffix)));
}

function prCalls(calls, sub) {
  return calls.filter(call => call.args[0] === 'pr' && call.args[1] === sub);
}

const doneBody = [
  'Closes #12',
  '',
  '## Why',
  '',
  '- The fee row wrapped out of view below 360px.',
  '',
  '## How',
  '',
  '- Let the row wrap its label instead of overflowing.',
  '',
  '## Tested',
  '',
  '- pnpm --filter @leather.io/extension test:unit',
  '- Not verified: the E2E spec, it needs a built extension.',
  '',
].join('\n');

describe('fix-issue-pr.sh', () => {
  describe('when the fixer is done and no branch or pull request exists', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = runPr(sandbox);

    it('succeeds and prints the new pull request URL', () => {
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /pull\/101/);
    });

    it('uploads text as utf-8 and binary as base64 blobs', () => {
      const blobs = result.calls
        .filter(call => call.args.some(arg => arg.endsWith('/git/blobs')))
        .map(call => JSON.parse(call.stdin));
      assert.deepEqual(
        blobs.map(blob => blob.encoding),
        ['utf-8', 'utf-8', 'base64']
      );
      assert.equal(blobs[0].content, 'export const feeRow = 2;\n');
      assert.equal(blobs[1].content, 'test("wraps", () => {});\n');
      assert.deepEqual(Buffer.from(blobs[2].content, 'base64'), binaryContent);
    });

    it('builds the tree on the parent with additions, modifications and deletions', () => {
      const tree = JSON.parse(apiCall(result.calls, '/git/trees').stdin);
      assert.equal(tree.base_tree, 'base-tree-sha');
      assert.deepEqual(
        tree.tree.map(entry => [entry.path, entry.mode, entry.sha === null]),
        [
          ['apps/extension/fee-row.tsx', '100644', false],
          ['apps/extension/old.ts', '100644', true],
          ['apps/extension/fee-row.spec.tsx', '100644', false],
          ['packages/utils/icon.bin', '100644', false],
        ]
      );
    });

    it('commits with the subject only and the checkout as the parent', () => {
      const commit = JSON.parse(apiCall(result.calls, '/git/commits').stdin);
      assert.deepEqual(commit, {
        message: 'fix(extension): keep the fee row visible on narrow popups',
        tree: 'new-tree-sha',
        parents: [sandbox.head],
      });
    });

    it('creates the branch ref', () => {
      const ref = apiCall(result.calls, '/git/refs');
      assert.deepEqual(ref.args.slice(0, 2), ['api', `repos/${repoName}/git/refs`]);
      assert.ok(ref.args.includes('ref=refs/heads/bot/fix-12'));
      assert.ok(ref.args.includes('sha=new-commit-sha'));
    });

    it('opens a ready pull request with the subject and a brief body', () => {
      const [create] = prCalls(result.calls, 'create');
      assert.ok(!create.args.includes('--draft'));
      assert.equal(
        create.args[create.args.indexOf('--title') + 1],
        'fix(extension): keep the fee row visible on narrow popups'
      );
      assert.equal(create.args[create.args.indexOf('--head') + 1], 'bot/fix-12');
      assert.equal(create.args[create.args.indexOf('--base') + 1], 'dev');
      assert.equal(create.body, doneBody);
      assert.doesNotMatch(create.body, /claude|generated|co-authored/i);
      assert.equal(prCalls(result.calls, 'edit').length, 0);
    });
  });

  it('keeps the executable bit of a changed script', () => {
    const sandbox = createSandbox();
    writeRepoFile(sandbox, 'packages/utils/run.sh', 'echo run fast\n');
    writeStatus(sandbox, doneStatus);
    const result = runPr(sandbox);
    assert.equal(result.status, 0, result.stderr);
    const tree = JSON.parse(apiCall(result.calls, '/git/trees').stdin);
    assert.deepEqual(
      tree.tree.map(entry => entry.mode),
      ['100755']
    );
  });

  it('closes every issue a grouped brief lists, the dispatched one first', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus.replace('CLOSES: 12', 'CLOSES: 14, #12, 15'));
    const result = runPr(sandbox);
    assert.equal(result.status, 0, result.stderr);
    const [create] = prCalls(result.calls, 'create');
    assert.match(create.body, /^Closes #12\nCloses #14\nCloses #15\n\n## Why\n/);
  });

  it('closes the dispatched issue when CLOSES is missing', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus.replace('CLOSES: 12\n', ''));
    const result = runPr(sandbox);
    assert.equal(result.status, 0, result.stderr);
    assert.match(prCalls(result.calls, 'create')[0].body, /^Closes #12\n\n## Why\n/);
  });

  it('force-updates an existing branch and edits the open pull request', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = runPr(sandbox, { state: { branchSha: 'old-sha', pr: '42 false' } });
    assert.equal(result.status, 0, result.stderr);
    const ref = apiCall(result.calls, '/git/refs/heads/bot/fix-12');
    assert.deepEqual(ref.args.slice(0, 4), [
      'api',
      '-X',
      'PATCH',
      `repos/${repoName}/git/refs/heads/bot/fix-12`,
    ]);
    assert.ok(ref.args.includes('force=true'));
    assert.equal(prCalls(result.calls, 'create').length, 0);
    const [edit] = prCalls(result.calls, 'edit');
    assert.equal(edit.args[2], '42');
    assert.equal(edit.body, doneBody);
    assert.equal(prCalls(result.calls, 'ready').length, 0);
    assert.equal(result.stdout.trim(), 'https://github.com/leather-io/mono/pull/42');
  });

  it('marks a draft pull request ready once a re-dispatch is done', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = runPr(sandbox, { state: { branchSha: 'old-sha', pr: '42 true' } });
    assert.equal(result.status, 0, result.stderr);
    const ready = prCalls(result.calls, 'ready');
    assert.deepEqual(
      ready.map(call => call.args),
      [['pr', 'ready', '42', '--repo', repoName]]
    );
  });

  describe('when the fixer is blocked with a partial diff', () => {
    const blockedBody = [
      'Refs #12',
      '',
      '## Blocked',
      '',
      '- Should the label truncate or wrap? Options: truncate with a tooltip, wrap onto two lines.',
      '',
      '## Why',
      '',
      '- The fee row wrapped out of view below 360px.',
      '',
    ].join('\n');

    it('opens a draft pull request that lists the questions', () => {
      const sandbox = createSandbox();
      makeFix(sandbox);
      writeStatus(sandbox, blockedStatus);
      const result = runPr(sandbox);
      assert.equal(result.status, 0, result.stderr);
      const [create] = prCalls(result.calls, 'create');
      assert.ok(create.args.includes('--draft'));
      assert.equal(create.body, blockedBody);
    });

    it('turns a ready pull request back into a draft', () => {
      const sandbox = createSandbox();
      makeFix(sandbox);
      writeStatus(sandbox, blockedStatus);
      const result = runPr(sandbox, { state: { branchSha: 'old-sha', pr: '42 false' } });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(prCalls(result.calls, 'edit')[0].body, blockedBody);
      assert.deepEqual(
        prCalls(result.calls, 'ready').map(call => call.args),
        [['pr', 'ready', '42', '--repo', repoName, '--undo']]
      );
    });
  });

  it('comments the questions on the issue when blocked with no diff', () => {
    const sandbox = createSandbox();
    writeStatus(sandbox, blockedStatus);
    const result = runPr(sandbox);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      result.calls.map(call => call.args.slice(0, 3)),
      [['issue', 'comment', '12']]
    );
    assert.equal(
      result.calls[0].body,
      'The `repo:fix-issues` run (https://github.com/leather-io/mono/actions/runs/777) stopped before changing anything. It needs answers to:\n\n- Should the label truncate or wrap? Options: truncate with a tooltip, wrap onto two lines.\n'
    );
  });

  it('fails when the fixer is done but nothing changed', () => {
    const sandbox = createSandbox();
    writeStatus(sandbox, doneStatus);
    const result = runPr(sandbox);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /STATE is done but nothing changed/);
    assert.deepEqual(result.calls, []);
  });

  it('refuses a change under .github/ and lists the paths', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeRepoFile(sandbox, '.github/workflows/evil.yml', 'on: push\n');
    writeRepoFile(sandbox, 'README.md', 'changed\n');
    writeStatus(sandbox, doneStatus);
    const result = runPr(sandbox);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\n {2}README\.md\n {2}\.github\/workflows\/evil\.yml\n/);
    assert.match(result.stderr, /refusing to commit/);
    assert.deepEqual(result.calls, []);
  });

  it('refuses to commit a symbolic link', () => {
    const sandbox = createSandbox();
    spawnSync('ln', ['-s', '../../.github', join(sandbox.repo, 'apps/extension/link')]);
    writeStatus(sandbox, doneStatus);
    const result = runPr(sandbox);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /symbolic link apps\/extension\/link/);
    assert.deepEqual(result.calls, []);
  });

  it('refuses to run on a checkout other than the parent', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = runPr(sandbox, { parentSha: '0'.repeat(40) });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /HEAD is not 0{40}/);
  });

  describe('subject validation', () => {
    const invalid = [
      ['', /COMMIT: is empty/],
      ['fix: keep the fee row visible', /not a conventional subject with a scope/],
      ['Fix(extension): keep the fee row visible', /not a conventional subject with a scope/],
      ['fixed(extension): keep the fee row visible', /not a conventional subject with a scope/],
      ['fix(extension):keep the fee row visible', /not a conventional subject with a scope/],
      ['fix(extension): keep the fee row visible (#12)', /names an issue number/],
      [`fix(extension): ${'a'.repeat(90)}`, /longer than 100 characters/],
    ];
    for (const [subject, message] of invalid) {
      it(`refuses ${JSON.stringify(subject.slice(0, 50))}`, () => {
        const sandbox = createSandbox();
        makeFix(sandbox);
        writeStatus(sandbox, doneStatus.replace(/^COMMIT: .*$/m, `COMMIT: ${subject}`));
        const result = runPr(sandbox);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, message);
        assert.deepEqual(result.calls, []);
      });
    }

    for (const subject of [
      'feat(mobile): show the stacking cycle',
      'fix(extension)!: drop the legacy fee route',
      'refactor(rpc-methods): split the sign handlers',
    ]) {
      it(`accepts ${JSON.stringify(subject)}`, () => {
        const sandbox = createSandbox();
        makeFix(sandbox);
        writeStatus(sandbox, doneStatus.replace(/^COMMIT: .*$/m, `COMMIT: ${subject}`));
        const result = runPr(sandbox);
        assert.equal(result.status, 0, result.stderr);
      });
    }
  });

  describe('with a patch from the fix job', () => {
    function createPatch(change) {
      const source = createSandbox();
      change(source);
      git(source, ['add', '-A']);
      const patch = spawnSync('git', ['diff', '--cached', '--binary', '--no-renames', 'HEAD'], {
        cwd: source.repo,
      }).stdout;
      const target = createSandbox();
      writeFileSync(join(target.repo, 'tmp/fix-issue/fix.patch'), patch);
      writeStatus(target, doneStatus);
      return target;
    }

    it('applies it and commits its files', () => {
      const sandbox = createPatch(makeFix);
      const result = runPr(sandbox, { env: { PATCH_FILE: 'tmp/fix-issue/fix.patch' } });
      assert.equal(result.status, 0, result.stderr);
      const tree = JSON.parse(apiCall(result.calls, '/git/trees').stdin);
      assert.equal(tree.tree.length, 4);
      assert.deepEqual(readFileSync(join(sandbox.repo, 'packages/utils/icon.bin')), binaryContent);
    });

    it('refuses a patch that touches .github/ before applying anything', () => {
      const sandbox = createPatch(source => {
        makeFix(source);
        writeRepoFile(source, '.github/scripts/fix-issue-pr.sh', 'echo owned\n');
      });
      const result = runPr(sandbox, { env: { PATCH_FILE: 'tmp/fix-issue/fix.patch' } });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /\n {2}\.github\/scripts\/fix-issue-pr\.sh\n/);
      assert.equal(git(sandbox, ['status', '--porcelain']), '');
      assert.deepEqual(result.calls, []);
    });

    it('does nothing with an empty patch', () => {
      const sandbox = createSandbox();
      writeFileSync(join(sandbox.repo, 'tmp/fix-issue/fix.patch'), '');
      writeStatus(sandbox, blockedStatus);
      const result = runPr(sandbox, { env: { PATCH_FILE: 'tmp/fix-issue/fix.patch' } });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(
        result.calls.map(call => call.args[0]),
        ['issue']
      );
    });
  });
});

describe('fix-issue-verify.sh', () => {
  const gate = [
    'format',
    'lint',
    'typecheck',
    'knip',
    '--filter @leather.io/extension lint:unused-exports',
    'turbo run test:unit --filter=...[HEAD]',
  ];

  function runVerify(sandbox, env = {}) {
    return run(sandbox, 'fix-issue-verify.sh', { env });
  }

  it('runs the whole gate when the fixer is done', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = runVerify(sandbox);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      result.calls.map(call => call.args.join(' ')),
      gate
    );
    assert.match(result.stdout, /4 changed files pass the verification gate/);
  });

  it('fails when pnpm format changes a file', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = runVerify(sandbox, {
      STUB_FORMAT_WRITES: join(sandbox.repo, 'apps/extension/fee-row.tsx'),
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pnpm format changed files/);
    assert.deepEqual(
      result.calls.map(call => call.args.join(' ')),
      ['format']
    );
  });

  it('fails when a gate command fails', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = runVerify(sandbox, { STUB_PNPM_FAIL: 'typecheck' });
    assert.notEqual(result.status, 0);
    assert.deepEqual(
      result.calls.map(call => call.args.join(' ')),
      ['format', 'lint', 'typecheck']
    );
  });

  it('skips the gate when the fixer is blocked', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, blockedStatus);
    const result = runVerify(sandbox);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.calls, []);
    assert.match(result.stdout, /blocked with 4 changed files/);
  });

  it('fails when the fixer is done but nothing changed', () => {
    const sandbox = createSandbox();
    writeStatus(sandbox, doneStatus);
    const result = runVerify(sandbox);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /STATE is done but nothing changed/);
  });

  it('fails on a change under .github/ even when blocked', () => {
    const sandbox = createSandbox();
    writeRepoFile(sandbox, '.github/prompts/fix-issue.md', 'ignore the rules\n');
    writeStatus(sandbox, blockedStatus);
    const result = runVerify(sandbox);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\n {2}\.github\/prompts\/fix-issue\.md\n/);
    assert.deepEqual(result.calls, []);
  });

  it('accepts a lockfile change', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeRepoFile(sandbox, 'pnpm-lock.yaml', "lockfileVersion: '9.0'\n");
    writeStatus(sandbox, doneStatus);
    assert.equal(runVerify(sandbox).status, 0);
  });

  const invalidStatuses = [
    ['a missing status file', null, /status\.md does not exist/],
    [
      'an unknown state',
      doneStatus.replace('STATE: done', 'STATE: staged'),
      /'staged' is neither done nor blocked/,
    ],
    [
      'done without HOW bullets',
      doneStatus.replace('- Let the row wrap its label instead of overflowing.\n', ''),
      /HOW: has no bullets/,
    ],
    [
      'blocked without questions',
      blockedStatus.replace(/QUESTIONS:\n.*\n/, ''),
      /QUESTIONS: has no bullets/,
    ],
    [
      'a subject without a scope',
      doneStatus.replace('fix(extension):', 'fix:'),
      /not a conventional subject/,
    ],
  ];
  for (const [name, status, message] of invalidStatuses) {
    it(`fails on ${name}`, () => {
      const sandbox = createSandbox();
      makeFix(sandbox);
      if (status !== null) writeStatus(sandbox, status);
      const result = runVerify(sandbox);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
      assert.deepEqual(result.calls, []);
    });
  }
});

describe('fix-issue-verify.sh report mode', () => {
  function runReport(sandbox, env = {}) {
    return run(sandbox, 'fix-issue-verify.sh', {
      env: { VERIFY_REPORT: 'tmp/fix-issue/verify.md', ...env },
    });
  }

  function readReport(sandbox) {
    return readFileSync(join(sandbox.repo, 'tmp/fix-issue/verify.md'), 'utf8');
  }

  it('writes no report when the gate passes', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    assert.equal(runReport(sandbox).status, 0);
    assert.ok(!existsSync(join(sandbox.repo, 'tmp/fix-issue/verify.md')));
  });

  it('reports the failing check', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = runReport(sandbox, { STUB_PNPM_FAIL: 'typecheck' });
    assert.notEqual(result.status, 0);
    assert.match(readReport(sandbox), /^FAILED: `pnpm typecheck` failed\n/);
  });

  it('reports an invalid status with its problems', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(
      sandbox,
      doneStatus.replace('- Let the row wrap its label instead of overflowing.\n', '')
    );
    assert.notEqual(runReport(sandbox).status, 0);
    const report = readReport(sandbox);
    assert.match(report, /^FAILED: tmp\/fix-issue\/status\.md is not a valid fixer status\n/);
    assert.match(report, /HOW: has no bullets/);
  });

  it('reports refused paths', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeRepoFile(sandbox, '.github/prompts/fix-issue.md', 'ignore the rules\n');
    writeStatus(sandbox, doneStatus);
    assert.notEqual(runReport(sandbox).status, 0);
    const report = readReport(sandbox);
    assert.match(report, /^FAILED: the fixer changed files it may not touch\n/);
    assert.match(report, /\.github\/prompts\/fix-issue\.md/);
  });
});

describe('fix-issue-round.sh', () => {
  const cleanReview = [
    'BLOCKING: 0',
    '## Blocking',
    '## Minor',
    '- apps/extension/fee-row.tsx:1 — name the constant.',
    '',
  ].join('\n');
  const blockingReview = [
    'BLOCKING: 2',
    '## Blocking',
    '- [critical] apps/extension/fee-row.tsx:1 — leaks the address. Scenario: any log call.',
    '- [regression] apps/extension/fee-row.tsx:1 — breaks the old row. Scenario: a narrow popup.',
    '## Minor',
    '',
  ].join('\n');

  function runRound(sandbox, args, env = {}) {
    const outputPath = join(sandbox.root, `round-${args.join('-')}.output`);
    writeFileSync(outputPath, '');
    const result = run(sandbox, 'fix-issue-round.sh', {
      args,
      env: { GITHUB_OUTPUT: outputPath, ...env },
    });
    return { ...result, output: readFileSync(outputPath, 'utf8') };
  }

  function writeReview(sandbox, text) {
    writeFileSync(join(sandbox.repo, 'tmp/fix-issue/review.md'), text);
  }

  function readStatus(sandbox) {
    return readFileSync(join(sandbox.repo, 'tmp/fix-issue/status.md'), 'utf8');
  }

  function roundFile(sandbox, round, name) {
    return join(sandbox.repo, 'tmp/fix-issue/rounds', String(round), name);
  }

  function reviewedRound(sandbox, round, review, env = {}) {
    assert.equal(runRound(sandbox, ['begin', String(round)]).status, 0);
    const verify = runRound(sandbox, ['verify', String(round)], env);
    assert.equal(verify.status, 0, verify.stderr);
    if (verify.output.includes('verified=true')) {
      runRound(sandbox, ['snapshot']);
      writeReview(sandbox, review);
      const check = runRound(sandbox, ['check-review', String(round)]);
      assert.equal(check.status, 0, check.stderr);
    }
    return runRound(sandbox, ['end', String(round)]);
  }

  it('records the fixer state when a round begins', () => {
    const sandbox = createSandbox();
    writeStatus(sandbox, blockedStatus);
    writeReview(sandbox, cleanReview);
    const result = runRound(sandbox, ['begin', '2']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, 'state=blocked\n');
    assert.ok(!existsSync(join(sandbox.repo, 'tmp/fix-issue/review.md')));
  });

  it('refuses a round that is not a number', () => {
    const sandbox = createSandbox();
    const result = runRound(sandbox, ['begin', 'x']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /'x' is not a round number/);
  });

  it('ends a round clean when the gate passes and the review finds nothing blocking', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = reviewedRound(sandbox, 1, cleanReview);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, 'outcome=clean\nclean=true\ncontinue=false\n');
    assert.ok(existsSync(roundFile(sandbox, 1, 'review.md')));
  });

  it('continues after a failed gate without running the review', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = reviewedRound(sandbox, 1, cleanReview, { STUB_PNPM_FAIL: 'lint' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, 'outcome=failed\nclean=false\ncontinue=true\n');
    assert.match(
      readFileSync(roundFile(sandbox, 1, 'verify.md'), 'utf8'),
      /^FAILED: `pnpm lint` failed/
    );
    assert.ok(!existsSync(roundFile(sandbox, 1, 'review.md')));
  });

  it('continues after blocking review findings', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    const result = reviewedRound(sandbox, 1, blockingReview);
    assert.equal(result.output, 'outcome=failed\nclean=false\ncontinue=true\n');
    assert.equal(
      readFileSync(roundFile(sandbox, 1, 'summary'), 'utf8'),
      'Round 1: review found 2 critical, blocker or regression findings\n'
    );
  });

  it('stops when the fixer is blocked', () => {
    const sandbox = createSandbox();
    writeStatus(sandbox, blockedStatus);
    runRound(sandbox, ['begin', '1']);
    const result = runRound(sandbox, ['end', '1']);
    assert.equal(result.output, 'outcome=blocked\nclean=false\ncontinue=false\n');
  });

  it('fails when the review changed a file', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    runRound(sandbox, ['begin', '1']);
    runRound(sandbox, ['verify', '1']);
    runRound(sandbox, ['snapshot']);
    writeRepoFile(sandbox, 'packages/utils/extra.ts', 'export const extra = 1;\n');
    writeReview(sandbox, cleanReview);
    const result = runRound(sandbox, ['check-review', '1']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /the review changed files/);
  });

  const invalidReviews = [
    ['a missing review file', null, /review\.md does not exist/],
    [
      'a count that is not a number',
      cleanReview.replace('BLOCKING: 0', 'BLOCKING: none'),
      /is not a number/,
    ],
    [
      'a count that disagrees with the list',
      blockingReview.replace('BLOCKING: 2', 'BLOCKING: 1'),
      /says 1 but ## Blocking lists 2 findings/,
    ],
  ];
  for (const [name, review, message] of invalidReviews) {
    it(`fails the review check on ${name}`, () => {
      const sandbox = createSandbox();
      makeFix(sandbox);
      writeStatus(sandbox, doneStatus);
      runRound(sandbox, ['snapshot']);
      if (review !== null) writeReview(sandbox, review);
      const result = runRound(sandbox, ['check-review', '1']);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
      assert.equal(result.output, '');
    });
  }

  it('finishes a clean run with one TESTED bullet per round', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    reviewedRound(sandbox, 1, cleanReview, { STUB_PNPM_FAIL: 'lint' });
    reviewedRound(sandbox, 2, cleanReview);
    const result = runRound(sandbox, ['finish']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.output, 'outcome=clean\n');
    const status = readStatus(sandbox);
    assert.match(
      status,
      /TESTED:\n- Round 1: `pnpm lint` failed\n- Round 2: checks passed and review found no critical, blocker or regression findings\n- pnpm --filter/
    );
    assert.match(status, /^STATE: done$/m);
  });

  it('turns a run that still fails after the last round into a blocked status', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, doneStatus);
    for (const round of [1, 2, 3]) reviewedRound(sandbox, round, blockingReview);
    const result = runRound(sandbox, ['finish']);
    assert.equal(result.output, 'outcome=failed\n');
    const status = readStatus(sandbox);
    assert.match(status, /^STATE: blocked$/m);
    assert.match(
      status,
      /QUESTIONS:\n- The fix still fails after 3 rounds \(review found 2 critical, blocker or regression findings\)\. Options:/
    );
    const verify = run(sandbox, 'fix-issue-verify.sh');
    assert.equal(verify.status, 0, verify.stderr);
  });

  it('keeps a blocked fixer status and its questions', () => {
    const sandbox = createSandbox();
    writeStatus(sandbox, blockedStatus);
    runRound(sandbox, ['begin', '1']);
    runRound(sandbox, ['end', '1']);
    const result = runRound(sandbox, ['finish']);
    assert.equal(result.output, 'outcome=blocked\n');
    const status = readStatus(sandbox);
    assert.match(status, /QUESTIONS:\n- Should the label truncate or wrap\?/);
    assert.match(status, /TESTED:\n- Round 1: the fixer stopped as blocked\n/);
  });

  it('fails to finish when no round ran', () => {
    const sandbox = createSandbox();
    writeStatus(sandbox, doneStatus);
    const result = runRound(sandbox, ['finish']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no round ran/);
  });
});

describe('fix-issue-pr.sh screenshots', () => {
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('image')]);
  const screenshotStatus = doneStatus.replace(
    '- Not verified: the E2E spec, it needs a built extension.\n',
    [
      '- Not verified: the E2E spec, it needs a built extension.',
      'SCREENSHOTS:',
      '- fee-row-narrow: Fee row on a 320px popup',
      '- fee-row-new: New | wrapped label',
      '',
    ].join('\n')
  );

  function writeShot(sandbox, side, id, content = png) {
    writeRepoFile(sandbox, `tmp/fix-issue/screenshots/${side}/${id}.png`, content);
  }

  function screenshotSetup(status = screenshotStatus) {
    const sandbox = createSandbox();
    makeFix(sandbox);
    writeStatus(sandbox, status);
    return sandbox;
  }

  function screenshotTree(calls) {
    return calls
      .filter(call => call.args[0] === 'api' && call.args.some(arg => arg.endsWith('/git/trees')))
      .map(call => JSON.parse(call.stdin))
      .find(tree => tree.tree.some(entry => entry.path.endsWith('.png')));
  }

  it('publishes before and after screenshots to a new branch and tables them', () => {
    const sandbox = screenshotSetup();
    writeShot(sandbox, 'before', 'fee-row-narrow');
    writeShot(sandbox, 'after', 'fee-row-narrow');
    writeShot(sandbox, 'after', 'fee-row-new');
    const result = runPr(sandbox, { state: { pr: '' } });
    assert.equal(result.status, 0, result.stderr);
    const tree = screenshotTree(result.calls);
    assert.deepEqual(
      tree.tree.map(entry => entry.path),
      [
        '12/777-1/before/fee-row-narrow.png',
        '12/777-1/after/fee-row-narrow.png',
        '12/777-1/after/fee-row-new.png',
      ]
    );
    assert.equal(tree.base_tree, undefined);
    const ref = result.calls.find(
      call => call.args[0] === 'api' && call.args.includes('ref=refs/heads/bot/screenshots')
    );
    assert.ok(ref);
    const body = prCalls(result.calls, 'create')[0].body;
    const base = 'https://raw.githubusercontent.com/leather-io/mono/new-commit-sha/12/777-1';
    assert.match(
      body,
      new RegExp(
        [
          '## Screenshots\\n\\n\\| State \\| Before \\| After \\|\\n\\| --- \\| --- \\| --- \\|\\n',
          `\\| Fee row on a 320px popup \\| !\\[Before: fee-row-narrow\\]\\(${base}/before/fee-row-narrow\\.png\\) `,
          `\\| !\\[After: fee-row-narrow\\]\\(${base}/after/fee-row-narrow\\.png\\) \\|\\n`,
          `\\| New \\\\\\| wrapped label \\| — \\| !\\[After: fee-row-new\\]\\(${base}/after/fee-row-new\\.png\\) \\|`,
        ].join('')
      )
    );
  });

  it('adds to an existing screenshots branch', () => {
    const sandbox = screenshotSetup();
    writeShot(sandbox, 'after', 'fee-row-narrow');
    const result = runPr(sandbox, { state: { pr: '', screenshotsSha: 'shots-head-sha' } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(screenshotTree(result.calls).base_tree, 'base-tree-sha');
    const update = result.calls.find(
      call =>
        call.args.includes('-X') &&
        call.args.some(arg => arg.endsWith('/git/refs/heads/bot/screenshots'))
    );
    assert.ok(update);
    assert.ok(!update.args.includes('force=true'));
  });

  it('skips files that are not PNGs and names that are not hyphenated lowercase', () => {
    const sandbox = screenshotSetup(
      screenshotStatus.replace('- fee-row-new: New | wrapped label', '- ../escape: Path traversal')
    );
    writeShot(sandbox, 'after', 'fee-row-narrow', Buffer.from('<svg onload=alert(1)>'));
    const result = runPr(sandbox, { state: { pr: '' } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(screenshotTree(result.calls), undefined);
    assert.match(result.stderr, /skipping screenshot '\.\.\/escape'/);
    assert.match(result.stderr, /skipping after\/fee-row-narrow\.png: not a PNG/);
    assert.doesNotMatch(prCalls(result.calls, 'create')[0].body, /## Screenshots/);
  });

  it('adds no section and makes no screenshot calls without SCREENSHOTS', () => {
    const sandbox = screenshotSetup(doneStatus);
    writeShot(sandbox, 'after', 'fee-row-narrow');
    const result = runPr(sandbox, { state: { pr: '' } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(screenshotTree(result.calls), undefined);
    assert.equal(prCalls(result.calls, 'create')[0].body, doneBody);
  });
});

describe('fix-issue-screenshots.sh', () => {
  function withXvfb(sandbox) {
    writeFileSync(join(sandbox.bin, 'xvfb-run'), '#!/bin/bash\nexec "$@"\n', { mode: 0o755 });
  }

  function runCapture(sandbox) {
    return run(sandbox, 'fix-issue-screenshots.sh', {
      args: ['capture'],
      env: { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
    });
  }

  it('does nothing without screenshot specs', () => {
    const sandbox = createSandbox();
    makeFix(sandbox);
    const result = runCapture(sandbox);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /no screenshot specs; nothing to capture/);
    assert.deepEqual(result.calls, []);
  });

  it('captures the fix, then dev, and brings the fix back intact', () => {
    const sandbox = createSandbox();
    withXvfb(sandbox);
    makeFix(sandbox);
    writeRepoFile(
      sandbox,
      'tmp/fix-issue/screenshot-specs/fee-row.spec.ts',
      'test("fee row", () => {});\n'
    );
    const before = git(sandbox, ['status', '--porcelain=v1', '--untracked-files=all']);
    const result = runCapture(sandbox);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      result.calls.filter(call => call.screenshotOf !== undefined).map(call => call.screenshotOf),
      ['export const feeRow = 2;\n', 'export const feeRow = 1;\n']
    );
    assert.ok(existsSync(join(sandbox.repo, 'tmp/fix-issue/screenshots/after/fee-row.png')));
    assert.ok(existsSync(join(sandbox.repo, 'tmp/fix-issue/screenshots/before/fee-row.png')));
    assert.equal(git(sandbox, ['status', '--porcelain=v1', '--untracked-files=all']), before);
    assert.equal(
      readFileSync(join(sandbox.repo, 'apps/extension/fee-row.tsx'), 'utf8'),
      'export const feeRow = 2;\n'
    );
    assert.equal(git(sandbox, ['stash', 'list']), '');
  });

  it('keeps the fix when the dev build fails', () => {
    const sandbox = createSandbox();
    withXvfb(sandbox);
    makeFix(sandbox);
    writeRepoFile(
      sandbox,
      'tmp/fix-issue/screenshot-specs/fee-row.spec.ts',
      'test("fee row", () => {});\n'
    );
    const before = git(sandbox, ['status', '--porcelain=v1', '--untracked-files=all']);
    const logPath = join(sandbox.root, 'build-count');
    writeFileSync(
      join(sandbox.bin, 'pnpm'),
      [
        '#!/bin/bash',
        `count=$(cat ${logPath} 2>/dev/null || echo 0)`,
        'if [ "$1" = turbo ]; then count=$((count + 1)); echo $count > ' + logPath + '; fi',
        'if [ "$1" = turbo ] && [ "$count" -ge 2 ]; then exit 1; fi',
        'if [[ " $* " == *" playwright "* ]]; then printf "\\x89PNG\\r\\n\\x1a\\n" > "$REVIEW_SCREENSHOT_DIR/fee-row.png"; fi',
        'exit 0',
        '',
      ].join('\n'),
      { mode: 0o755 }
    );
    const result = runCapture(sandbox);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /dev did not build/);
    assert.ok(existsSync(join(sandbox.repo, 'tmp/fix-issue/screenshots/after/fee-row.png')));
    assert.equal(git(sandbox, ['status', '--porcelain=v1', '--untracked-files=all']), before);
  });
});

describe('fix-issue-fetch.sh', () => {
  const openIssue = {
    number: 12,
    title: 'Fee row overflows on narrow popups',
    html_url: 'https://github.com/leather-io/mono/issues/12',
    state: 'open',
    user: { login: 'reporter' },
    created_at: '2026-11-01T10:00:00Z',
    labels: [{ name: 'bug' }, { name: 'extension' }],
    body: 'The fee row is cut off.',
  };
  const comments = [
    { user: { login: 'first' }, created_at: '2026-11-02T10:00:00Z', body: 'Seen on 360px.' },
    { user: { login: 'second' }, created_at: '2026-11-03T10:00:00Z', body: null },
  ];

  function runFetch(sandbox, state, issue = '12') {
    return run(sandbox, 'fix-issue-fetch.sh', { state, env: { ISSUE: issue } });
  }

  it('writes the issue and its comments in order', () => {
    const sandbox = createSandbox();
    const result = runFetch(sandbox, { issue: openIssue, comments });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(join(sandbox.repo, 'tmp/fix-issue/issue.md'), 'utf8'),
      [
        '# Fee row overflows on narrow popups',
        '',
        'https://github.com/leather-io/mono/issues/12',
        '',
        'Labels: bug, extension',
        'Opened by @reporter on 2026-11-01T10:00:00Z',
        '',
        '## Body',
        '',
        'The fee row is cut off.',
        '',
        '## Comments',
        '',
        '### @first on 2026-11-02T10:00:00Z',
        '',
        'Seen on 360px.',
        '',
        '### @second on 2026-11-03T10:00:00Z',
        '',
        '(empty)',
        '',
      ].join('\n')
    );
    const saved = JSON.parse(readFileSync(join(sandbox.repo, 'tmp/fix-issue/issue.json'), 'utf8'));
    assert.equal(saved.comments.length, 2);
    assert.deepEqual(
      result.calls.map(call => call.args.filter(arg => arg.startsWith('repos/'))),
      [[`repos/${repoName}/issues/12`], [`repos/${repoName}/issues/12/comments`]]
    );
  });

  it('writes "none" for an issue without labels or comments', () => {
    const sandbox = createSandbox();
    const result = runFetch(sandbox, { issue: { ...openIssue, labels: [], body: '' } });
    assert.equal(result.status, 0, result.stderr);
    const text = readFileSync(join(sandbox.repo, 'tmp/fix-issue/issue.md'), 'utf8');
    assert.match(text, /Labels: none\n/);
    assert.match(text, /## Body\n\n\(empty\)\n/);
    assert.match(text, /## Comments\n\nnone\n$/);
  });

  const failures = [
    ['a closed issue', { issue: { ...openIssue, state: 'closed' } }, '12', /issue #12 is closed/],
    [
      'a pull request',
      { issue: { ...openIssue, pull_request: {} } },
      '12',
      /#12 is a pull request/,
    ],
    ['a missing issue', {}, '12', /issue #12 was not found/],
    ['a non-numeric issue', { issue: openIssue }, '12; rm -rf /', /is not an issue number/],
  ];
  for (const [name, state, issue, message] of failures) {
    it(`fails with one line for ${name}`, () => {
      const sandbox = createSandbox();
      const result = runFetch(sandbox, state, issue);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
      assert.equal(result.stderr.trim().split('\n').length, 1);
      assert.equal(existsSync(join(sandbox.repo, 'tmp/fix-issue/issue.md')), false);
    });
  }
});
