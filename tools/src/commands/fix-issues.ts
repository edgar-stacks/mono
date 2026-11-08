import type { Command } from 'commander';

import { repoRoot } from '../fix-issues/git.js';
import { createGitHubClient } from '../fix-issues/github.js';
import { fetchIssue } from '../fix-issues/issue.js';
import { writeStepOutputs } from '../fix-issues/outputs.js';
import { fixIssuePaths } from '../fix-issues/paths.js';
import { openPullRequest } from '../fix-issues/pull-request.js';
import {
  beginRound,
  checkReview,
  endRound,
  finishRounds,
  parseRound,
  snapshotForReview,
  verifyRound,
} from '../fix-issues/rounds.js';
import { captureScreenshots, previewScreenshots } from '../fix-issues/screenshots.js';
import { stripForbiddenPaths } from '../fix-issues/strip.js';
import { verifyFix } from '../fix-issues/verify.js';

interface RoundOptions {
  readonly round: string;
}

interface IssueOptions {
  readonly issue: string;
}

interface OpenPullRequestFlags {
  readonly issue: string;
  readonly branch: string;
  readonly base: string;
  readonly parentSha: string;
}

function paths() {
  return fixIssuePaths(repoRoot(process.cwd()));
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function parseIssue(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`'${value}' is not an issue number`);
  return Number(value);
}

function github() {
  return createGitHubClient({ token: requireEnv('GH_TOKEN'), apiUrl: process.env.GITHUB_API_URL });
}

async function guard(step: string, action: () => Promise<void> | void): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(`${step}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export function registerFixIssuesCommands(program: Command): void {
  const fixIssues = program
    .command('fix-issues')
    .description(
      'Steps of the repo:fix-issues workflow: fetch, rounds, verify, screenshots, pull request'
    );

  fixIssues
    .command('fetch-issue')
    .description('Render the issue and its comments to tmp/fix-issue/issue.md')
    .requiredOption('--issue <number>', 'Issue number')
    .action(({ issue }: IssueOptions) =>
      guard('fetch-issue', async () => {
        const target = paths();
        const comments = await fetchIssue({
          client: github(),
          repo: requireEnv('GITHUB_REPOSITORY'),
          issue: parseIssue(issue),
          outFile: target.issueFile,
        });
        console.log(`fetch-issue: wrote ${target.issueFile} with ${comments} comments`);
      })
    );

  fixIssues
    .command('verify')
    .description('Run the verification gate on the fixer status and change')
    .option('--report', 'Write a failure report to tmp/fix-issue/verify.md instead of only failing')
    .action(({ report }: { readonly report?: boolean }) =>
      guard('verify-fix', () => {
        const target = paths();
        const result = verifyFix({
          root: target.root,
          statusFile: target.statusFile,
          reportFile: report ? target.verifyReport : undefined,
        });
        if (!result.passed) process.exitCode = 1;
      })
    );

  const round = fixIssues.command('round').description('One fix → verify → review round');

  round
    .command('begin')
    .requiredOption('--round <n>', 'Round number')
    .action(({ round: value }: RoundOptions) =>
      guard('fix-round', () => {
        const state = beginRound(paths(), parseRound(value));
        writeStepOutputs({ state: state ?? '' });
        console.log(`fix-round: round ${value} fixer state is '${state ?? 'missing'}'`);
      })
    );

  round
    .command('verify')
    .requiredOption('--round <n>', 'Round number')
    .action(({ round: value }: RoundOptions) =>
      guard('fix-round', () => {
        parseRound(value);
        writeStepOutputs({ verified: verifyRound(paths()) });
      })
    );

  round.command('snapshot').action(() => guard('fix-round', () => snapshotForReview(paths())));

  round
    .command('check-review')
    .requiredOption('--round <n>', 'Round number')
    .action(({ round: value }: RoundOptions) =>
      guard('fix-round', () => {
        parseRound(value);
        const blocking = checkReview(paths());
        writeStepOutputs({ blocking });
        console.log(`fix-round: round ${value} review found ${blocking} blocking findings`);
      })
    );

  round
    .command('end')
    .requiredOption('--round <n>', 'Round number')
    .action(({ round: value }: RoundOptions) =>
      guard('fix-round', () => {
        const end = endRound(paths(), parseRound(value));
        writeStepOutputs({ outcome: end.outcome, clean: end.clean, continue: end.continue });
        console.log(`fix-round: ${end.summary}`);
      })
    );

  round.command('finish').action(() =>
    guard('fix-round', () => {
      const outcome = finishRounds(paths());
      writeStepOutputs({ outcome });
      console.log(`fix-round: finished with outcome ${outcome}`);
    })
  );

  fixIssues
    .command('strip-forbidden')
    .description(
      'Remove changes outside the allowed paths and block the status with a question naming them'
    )
    .action(() =>
      guard('strip-forbidden', () => {
        const stripped = stripForbiddenPaths(paths());
        writeStepOutputs({ stripped: stripped.length });
        console.log(
          stripped.length === 0
            ? 'strip-forbidden: every change is under the allowed paths'
            : `strip-forbidden: removed ${stripped.length} changes outside the allowed paths:\n  ${stripped.join('\n  ')}`
        );
      })
    );

  const screenshots = fixIssues
    .command('screenshots')
    .description('Before and after screenshots of changed screens');
  screenshots
    .command('preview')
    .description('Run the screenshot specs against the current build')
    .action(() => guard('fix-issue-screenshots', () => previewScreenshots({ paths: paths() })));
  screenshots
    .command('capture')
    .description('Build and capture the fix, then dev, and restore the fix')
    .action(() => guard('fix-issue-screenshots', () => captureScreenshots({ paths: paths() })));

  fixIssues
    .command('open-pull-request')
    .description('Commit the patch to the branch and open or update its pull request')
    .requiredOption('--issue <number>', 'Issue number')
    .requiredOption('--branch <branch>', 'Pull request branch')
    .requiredOption('--base <branch>', 'Base branch')
    .requiredOption('--parent-sha <sha>', 'Commit the patch was made against')
    .action(({ issue, branch, base, parentSha }: OpenPullRequestFlags) =>
      guard('open-pull-request', async () => {
        const url = await openPullRequest({
          client: github(),
          paths: paths(),
          repo: requireEnv('GITHUB_REPOSITORY'),
          issue: parseIssue(issue),
          branch,
          baseBranch: base,
          parentSha,
          runId: process.env.GITHUB_RUN_ID,
          runAttempt: process.env.GITHUB_RUN_ATTEMPT,
          serverUrl: process.env.GITHUB_SERVER_URL,
        });
        console.log(url);
      })
    );
}
