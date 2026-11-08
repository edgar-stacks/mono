import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type CommandRunner, runCommand } from './exec.js';
import { allowedPathsDescription, changedPaths, refusedPaths, treeSnapshot } from './git.js';
import { readStatus } from './status.js';

interface VerifyOptions {
  readonly root: string;
  readonly statusFile: string;
  readonly reportFile?: string;
  readonly run?: CommandRunner;
  log?(line: string): void;
}

type VerifyResult =
  | { readonly passed: true; readonly message: string }
  | { readonly passed: false; readonly message: string; readonly details: string };

const formatCommand: readonly string[] = ['format'];
const gateCommands: readonly (readonly string[])[] = [
  ['lint'],
  ['typecheck'],
  ['knip'],
  ['--filter', '@leather.io/extension', 'lint:unused-exports'],
  ['turbo', 'run', 'test:unit', '--filter=...[HEAD]'],
];
const reportTailLines = 150;

function tail(text: string): string {
  return text.trimEnd().split('\n').slice(-reportTailLines).join('\n');
}

function formatVerifyReport(result: {
  readonly message: string;
  readonly details: string;
}): string {
  const details = result.details.trim();
  return details
    ? `FAILED: ${result.message}\n\n\`\`\`\n${tail(details)}\n\`\`\`\n`
    : `FAILED: ${result.message}\n`;
}

function passThrough(command: string, args: readonly string[], options: { cwd: string }) {
  const result = runCommand(command, args, options);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result;
}

function checkGate(root: string, run: CommandRunner): VerifyResult {
  const before = treeSnapshot(root);
  const format = run('pnpm', formatCommand, { cwd: root });
  if (format.status !== 0) {
    return {
      passed: false,
      message: '`pnpm format` failed',
      details: format.stdout + format.stderr,
    };
  }
  if (treeSnapshot(root) !== before) {
    const status = runCommand('git', ['status', '--short'], { cwd: root }).stdout;
    return {
      passed: false,
      message: 'pnpm format changed files the fixer left unformatted',
      details: status,
    };
  }
  for (const args of gateCommands) {
    const result = run('pnpm', args, { cwd: root });
    if (result.status !== 0) {
      return {
        passed: false,
        message: `\`pnpm ${args.join(' ')}\` failed`,
        details: result.stdout + result.stderr,
      };
    }
  }
  return { passed: true, message: 'the verification gate passed' };
}

export function verifyFix({
  root,
  statusFile,
  reportFile,
  run = passThrough,
  log = console.log,
}: VerifyOptions): VerifyResult {
  const result = evaluate(root, statusFile, run);
  if (reportFile && !result.passed) {
    mkdirSync(path.dirname(reportFile), { recursive: true });
    writeFileSync(reportFile, formatVerifyReport(result));
  }
  log(`verify-fix: ${result.message}`);
  return result;
}

function evaluate(root: string, statusFile: string, run: CommandRunner): VerifyResult {
  const status = readStatus(statusFile);
  if (!status.ok) {
    return {
      passed: false,
      message: `${path.relative(root, statusFile)} is not a valid fixer status`,
      details: status.problems.join('\n'),
    };
  }
  const changes = changedPaths(root);
  const refused = refusedPaths(changes.map(change => change.path));
  if (refused.length > 0) {
    return {
      passed: false,
      message: 'the fixer changed files it may not touch',
      details: `Only ${allowedPathsDescription} may change:\n${refused.join('\n')}`,
    };
  }
  if (status.status.state === 'blocked') {
    return {
      passed: true,
      message: `the fixer is blocked with ${changes.length} changed files; skipping the verification gate`,
    };
  }
  if (changes.length === 0) {
    return { passed: false, message: 'state is done but nothing changed', details: '' };
  }
  const gate = checkGate(root, run);
  return gate.passed
    ? { passed: true, message: `${changes.length} changed files pass the verification gate` }
    : gate;
}
