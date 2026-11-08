import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  beginRound,
  checkReview,
  endRound,
  finishRounds,
  parseRound,
  snapshotForReview,
  verifyRound,
} from './rounds.js';
import { readStatus } from './status.js';
import { type TestRepo, blockedStatus, createTestRepo, doneStatus, fakePnpm } from './test-repo.js';

const cleanReview = {
  blocking: [],
  minor: [{ location: 'apps/extension/fee-row.tsx:1', note: 'name the constant' }],
};
const blockingReview = {
  blocking: [
    {
      kind: 'critical',
      location: 'apps/extension/fee-row.tsx:1',
      defect: 'leaks the address',
      scenario: 'any log call',
    },
    {
      kind: 'regression',
      location: 'apps/extension/fee-row.tsx:1',
      defect: 'breaks the old row',
      scenario: 'a narrow popup',
    },
  ],
  minor: [],
};

describe('rounds', () => {
  let repo: TestRepo;
  beforeEach(() => {
    repo = createTestRepo();
  });
  afterEach(() => repo.cleanup());

  function writeReview(review: unknown) {
    writeFileSync(repo.paths.reviewFile, JSON.stringify(review));
  }

  function reviewedRound(round: number, review: unknown, fail?: string) {
    beginRound(repo.paths, round);
    if (verifyRound(repo.paths, fakePnpm(repo, { fail }).run)) {
      snapshotForReview(repo.paths);
      writeReview(review);
      checkReview(repo.paths);
    }
    return endRound(repo.paths, round);
  }

  function roundFile(round: number, name: string) {
    return path.join(repo.paths.roundsDir, String(round), name);
  }

  test('a round begins by reading the fixer state and clearing the last round', () => {
    repo.writeStatus(blockedStatus);
    writeReview(cleanReview);
    expect(beginRound(repo.paths, 2)).toBe('blocked');
    expect(existsSync(repo.paths.reviewFile)).toBe(false);
  });

  test('a round number must be 1 to 9', () => {
    expect(parseRound('3')).toBe(3);
    expect(() => parseRound('x')).toThrow("'x' is not a round number from 1 to 9");
  });

  test('a round is clean when the gate passes and the review finds nothing blocking', () => {
    repo.makeFix();
    repo.writeStatus(doneStatus);
    expect(reviewedRound(1, cleanReview)).toMatchObject({
      outcome: 'clean',
      clean: true,
      continue: false,
    });
    expect(existsSync(roundFile(1, 'review.json'))).toBe(true);
  });

  test('a failed gate continues to the next round without a review', () => {
    repo.makeFix();
    repo.writeStatus(doneStatus);
    expect(reviewedRound(1, cleanReview, 'lint')).toEqual({
      outcome: 'failed',
      clean: false,
      continue: true,
      summary: 'Round 1: `pnpm lint` failed',
    });
    expect(readFileSync(roundFile(1, 'verify.md'), 'utf8')).toMatch(/^FAILED: `pnpm lint` failed/);
    expect(existsSync(roundFile(1, 'review.json'))).toBe(false);
  });

  test('blocking review findings continue to the next round', () => {
    repo.makeFix();
    repo.writeStatus(doneStatus);
    expect(reviewedRound(1, blockingReview)).toMatchObject({
      outcome: 'failed',
      summary: 'Round 1: review found 2 critical, blocker or regression findings',
    });
  });

  test('a blocked fixer stops the rounds', () => {
    repo.writeStatus(blockedStatus);
    beginRound(repo.paths, 1);
    expect(endRound(repo.paths, 1)).toMatchObject({ outcome: 'blocked', continue: false });
  });

  test('a review that changes a file fails the run', () => {
    repo.makeFix();
    repo.writeStatus(doneStatus);
    snapshotForReview(repo.paths);
    repo.write('packages/utils/extra.ts', 'export const extra = 1;\n');
    writeReview(cleanReview);
    expect(() => checkReview(repo.paths)).toThrow(/the review changed files/);
  });

  test.each([
    ['a missing review file', null, /review\.json does not exist/],
    [
      'an unknown finding kind',
      { blocking: [{ ...blockingReview.blocking[0], kind: 'nit' }] },
      /blocking\.0\.kind/,
    ],
    ['invalid JSON', '{ blocking', /is not valid JSON/],
  ])('a review check fails on %s', (_name, review, message) => {
    repo.makeFix();
    repo.writeStatus(doneStatus);
    snapshotForReview(repo.paths);
    if (typeof review === 'string') writeFileSync(repo.paths.reviewFile, review);
    else if (review !== null) writeReview(review);
    expect(() => checkReview(repo.paths)).toThrow(message);
  });

  test('finishing a clean run records every round under tested', () => {
    repo.makeFix();
    repo.writeStatus(doneStatus);
    reviewedRound(1, cleanReview, 'lint');
    reviewedRound(2, cleanReview);
    expect(finishRounds(repo.paths)).toBe('clean');
    const status = readStatus(repo.paths.statusFile);
    expect(status.ok && status.status.state).toBe('done');
    expect(status.ok && status.status.tested).toEqual([
      'Round 1: `pnpm lint` failed',
      'Round 2: checks passed and review found no critical, blocker or regression findings',
      ...doneStatus.tested,
    ]);
  });

  test('a run that still fails after its last round becomes blocked with a question', () => {
    repo.makeFix();
    repo.writeStatus(doneStatus);
    for (const round of [1, 2, 3]) reviewedRound(round, blockingReview);
    expect(finishRounds(repo.paths)).toBe('failed');
    const status = readStatus(repo.paths.statusFile);
    expect(status.ok && status.status.state).toBe('blocked');
    expect(status.ok && status.status.questions).toEqual([
      'The fix still fails after 3 rounds (review found 2 critical, blocker or regression findings). Options: dispatch again with guidance in the brief; take the branch over locally.',
    ]);
  });

  test('a blocked fixer keeps its questions', () => {
    repo.writeStatus(blockedStatus);
    beginRound(repo.paths, 1);
    endRound(repo.paths, 1);
    expect(finishRounds(repo.paths)).toBe('blocked');
    const status = readStatus(repo.paths.statusFile);
    expect(status.ok && status.status.questions).toEqual(blockedStatus.questions);
    expect(status.ok && status.status.tested).toEqual(['Round 1: the fixer stopped as blocked']);
  });

  test('finishing fails when no round ran', () => {
    repo.writeStatus(doneStatus);
    expect(() => finishRounds(repo.paths)).toThrow('no round ran');
  });
});
