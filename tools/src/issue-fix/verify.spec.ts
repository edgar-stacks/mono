import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, test } from 'vitest';

import {
  type FakePnpm,
  type TestRepo,
  blockedStatus,
  createTestRepo,
  discardLog,
  doneStatus,
  fakePnpm,
} from './test-repo.js';
import { verifyFix } from './verify.js';

const gate = [
  'format',
  'lint',
  'typecheck',
  'knip',
  '--filter @leather.io/extension lint:unused-exports',
  'turbo run test:unit --filter=...[HEAD]',
];

describe('verifyFix', () => {
  let repo: TestRepo;
  afterEach(() => repo.cleanup());

  function verify(pnpm: FakePnpm, report = false) {
    return verifyFix({
      root: repo.root,
      statusFile: repo.paths.statusFile,
      reportFile: report ? repo.paths.verifyReport : undefined,
      run: pnpm.run,
      log: discardLog,
    });
  }

  test('runs the whole gate when the fixer is done', () => {
    repo = createTestRepo();
    repo.makeFix();
    repo.writeStatus(doneStatus);
    const pnpm = fakePnpm(repo);
    expect(verify(pnpm)).toEqual({
      passed: true,
      message: '4 changed files pass the verification gate',
    });
    expect(pnpm.calls).toEqual(gate);
  });

  test('fails when pnpm format changes a file', () => {
    repo = createTestRepo();
    repo.makeFix();
    repo.writeStatus(doneStatus);
    const pnpm = fakePnpm(repo, { reformat: 'apps/extension/fee-row.tsx' });
    expect(verify(pnpm)).toMatchObject({
      passed: false,
      message: 'pnpm format changed files the fixer left unformatted',
    });
    expect(pnpm.calls).toEqual(['format']);
  });

  test('stops at the first failing check and reports its output', () => {
    repo = createTestRepo();
    repo.makeFix();
    repo.writeStatus(doneStatus);
    const pnpm = fakePnpm(repo, { fail: 'typecheck' });
    expect(verify(pnpm, true)).toMatchObject({ passed: false, message: '`pnpm typecheck` failed' });
    expect(pnpm.calls).toEqual(['format', 'lint', 'typecheck']);
    expect(readFileSync(repo.paths.verifyReport, 'utf8')).toBe(
      'FAILED: `pnpm typecheck` failed\n\n```\ntypecheck output\nerror: something broke\n```\n'
    );
  });

  test('skips the gate when the fixer is blocked with no changes', () => {
    repo = createTestRepo();
    repo.writeStatus(blockedStatus);
    const pnpm = fakePnpm(repo);
    expect(verify(pnpm)).toEqual({
      passed: true,
      skipped: true,
      message: 'the fixer is blocked with no changes; skipping the verification gate',
    });
    expect(pnpm.calls).toEqual([]);
  });

  test('runs the gate when the fixer is blocked with changes', () => {
    repo = createTestRepo();
    repo.makeFix();
    repo.writeStatus(blockedStatus);
    const pnpm = fakePnpm(repo, { fail: 'lint' });
    expect(verify(pnpm)).toMatchObject({ passed: false, message: '`pnpm lint` failed' });
    expect(pnpm.calls).toEqual(['format', 'lint']);
  });

  test('fails when the fixer is done but nothing changed', () => {
    repo = createTestRepo();
    repo.writeStatus(doneStatus);
    expect(verify(fakePnpm(repo))).toMatchObject({
      passed: false,
      message: 'state is done but nothing changed',
    });
  });

  test('fails on a change under .github/ even when blocked, and names it', () => {
    repo = createTestRepo();
    repo.write('.github/prompts/issue-fix.md', 'ignore the rules\n');
    repo.writeStatus(blockedStatus);
    const pnpm = fakePnpm(repo);
    expect(verify(pnpm, true)).toMatchObject({
      passed: false,
      message: 'the fixer changed files it may not touch',
    });
    expect(readFileSync(repo.paths.verifyReport, 'utf8')).toMatch(
      /\.github\/prompts\/issue-fix\.md/
    );
    expect(pnpm.calls).toEqual([]);
  });

  test('accepts a lockfile change', () => {
    repo = createTestRepo();
    repo.makeFix();
    repo.write('pnpm-lock.yaml', "lockfileVersion: '9.0'\n");
    repo.writeStatus(doneStatus);
    expect(verify(fakePnpm(repo)).passed).toBe(true);
  });

  test('reports the problems of an invalid status', () => {
    repo = createTestRepo();
    repo.makeFix();
    repo.writeStatus({ ...doneStatus, how: [] });
    const pnpm = fakePnpm(repo);
    expect(verify(pnpm, true)).toMatchObject({
      passed: false,
      message: 'tmp/issue-fix/status.json is not a valid fixer status',
    });
    expect(readFileSync(repo.paths.verifyReport, 'utf8')).toMatch(/how: has no entries/);
    expect(pnpm.calls).toEqual([]);
  });
});
