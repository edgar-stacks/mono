import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { type CommandRunner, runCommand } from './exec.js';
import { treeSnapshot } from './git.js';
import type { IssueFixPaths } from './paths.js';
import { readReview } from './review.js';
import { type FixState, readState, readStatus, writeStatus } from './status.js';
import { verifyFix } from './verify.js';

const outcomeSchema = z.enum(['clean', 'failed', 'blocked']);
type RoundOutcome = z.infer<typeof outcomeSchema>;

const runStateSchema = z.object({
  rounds: z.array(
    z.object({ round: z.number().int().positive(), outcome: outcomeSchema, summary: z.string() })
  ),
});
type RunState = z.infer<typeof runStateSchema>;

interface RoundEnd {
  readonly outcome: RoundOutcome;
  readonly clean: boolean;
  readonly continue: boolean;
  readonly summary: string;
}

export function parseRound(value: string): number {
  if (!/^[1-9]$/.test(value)) throw new Error(`'${value}' is not a round number from 1 to 9`);
  return Number(value);
}

function roundDir(paths: IssueFixPaths, round: number): string {
  return path.join(paths.roundsDir, String(round));
}

function readRunState(paths: IssueFixPaths): RunState {
  if (!existsSync(paths.runFile)) return { rounds: [] };
  return runStateSchema.parse(JSON.parse(readFileSync(paths.runFile, 'utf8')));
}

function writeRunState(paths: IssueFixPaths, state: RunState): void {
  writeFileSync(paths.runFile, `${JSON.stringify(state, null, 2)}\n`);
}

export function beginRound(paths: IssueFixPaths, round: number): FixState | null {
  for (const file of [paths.verifyReport, paths.reviewFile, paths.reviewSnapshot]) {
    rmSync(file, { force: true });
  }
  mkdirSync(roundDir(paths, round), { recursive: true });
  return readState(paths.statusFile);
}

export function verifyRound(paths: IssueFixPaths, run?: CommandRunner): boolean {
  const result = verifyFix({
    root: paths.root,
    statusFile: paths.statusFile,
    reportFile: paths.verifyReport,
    run,
  });
  if (result.passed) rmSync(paths.verifyReport, { force: true });
  return result.passed && !result.skipped;
}

export function snapshotForReview(paths: IssueFixPaths): void {
  mkdirSync(paths.workDir, { recursive: true });
  writeFileSync(paths.reviewSnapshot, treeSnapshot(paths.root));
}

export function checkReview(paths: IssueFixPaths): number {
  if (!existsSync(paths.reviewSnapshot)) {
    throw new Error(`${paths.reviewSnapshot} does not exist; run the snapshot step first`);
  }
  if (treeSnapshot(paths.root) !== readFileSync(paths.reviewSnapshot, 'utf8')) {
    const changed = runCommand('git', ['status', '--short'], { cwd: paths.root }).stdout;
    throw new Error(`the review changed files; it may only write the review file\n${changed}`);
  }
  return readReview(paths.reviewFile).blocking.length;
}

function checksSummary(paths: IssueFixPaths): string | null {
  if (existsSync(paths.verifyReport)) {
    const firstLine = readFileSync(paths.verifyReport, 'utf8').split('\n')[0] ?? '';
    return firstLine.replace(/^FAILED: /, '');
  }
  if (!existsSync(paths.reviewFile)) return null;
  const blocking = readReview(paths.reviewFile).blocking.length;
  return blocking === 0
    ? 'checks passed and review found no critical, blocker or regression findings'
    : `review found ${blocking} critical, blocker or regression findings`;
}

function decideOutcome(
  paths: IssueFixPaths,
  round: number
): { outcome: RoundOutcome; summary: string } {
  const checks = checksSummary(paths);
  if (readState(paths.statusFile) === 'blocked') {
    const stopped = `Round ${round}: the fixer stopped as blocked`;
    return { outcome: 'blocked', summary: checks ? `${stopped}; ${checks}` : stopped };
  }
  if (checks === null) {
    throw new Error(`round ${round} has neither a verify report nor a review`);
  }
  const passed =
    !existsSync(paths.verifyReport) && readReview(paths.reviewFile).blocking.length === 0;
  return { outcome: passed ? 'clean' : 'failed', summary: `Round ${round}: ${checks}` };
}

function unfixedFindingsQuestion(paths: IssueFixPaths, round: number): string | null {
  const file = path.join(roundDir(paths, round), path.basename(paths.reviewFile));
  if (!existsSync(file)) return null;
  const { blocking } = readReview(file);
  if (blocking.length === 0) return null;
  const findings = blocking.map(
    finding => `${finding.kind} at ${finding.location}: ${finding.defect}`
  );
  return `The review found ${blocking.length} critical, blocker or regression findings that no round fixed because the fixer stopped as blocked: ${findings.join('; ')}. Options: answer the questions and dispatch again; fix them on this branch by hand.`;
}

export function endRound(paths: IssueFixPaths, round: number): RoundEnd {
  const { outcome, summary } = decideOutcome(paths, round);
  const dir = roundDir(paths, round);
  mkdirSync(dir, { recursive: true });
  for (const file of [paths.verifyReport, paths.reviewFile]) {
    if (existsSync(file)) copyFileSync(file, path.join(dir, path.basename(file)));
  }
  const state = readRunState(paths);
  writeRunState(paths, {
    rounds: [...state.rounds.filter(entry => entry.round !== round), { round, outcome, summary }],
  });
  return { outcome, clean: outcome === 'clean', continue: outcome === 'failed', summary };
}

export function finishRounds(paths: IssueFixPaths): RoundOutcome {
  const rounds = [...readRunState(paths).rounds].sort((a, b) => a.round - b.round);
  const last = rounds.at(-1);
  if (!last) throw new Error('no round ran');
  const status = readStatus(paths.statusFile);
  if (!status.ok) {
    throw new Error(`the fixer never wrote a valid status:\n  ${status.problems.join('\n  ')}`);
  }
  const summaries = rounds.map(entry => entry.summary);
  const lastReason = last.summary.replace(/^Round \d+: /, '');
  const unfixed = last.outcome === 'blocked' ? unfixedFindingsQuestion(paths, last.round) : null;
  writeStatus(
    paths.statusFile,
    last.outcome === 'failed'
      ? {
          ...status.status,
          state: 'blocked',
          tested: [...summaries, ...status.status.tested],
          questions: [
            ...status.status.questions,
            `The fix still fails after ${last.round} rounds (${lastReason}). Options: dispatch again with guidance in the brief; take the branch over locally.`,
          ],
        }
      : {
          ...status.status,
          tested: [...summaries, ...status.status.tested],
          questions: unfixed ? [...status.status.questions, unfixed] : status.status.questions,
        }
  );
  return last.outcome;
}
