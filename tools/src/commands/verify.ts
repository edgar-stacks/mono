import type { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { getFeatureMapAppConfig, toRepoRelative } from '../feature-map/app-config.js';
import { buildFeatureMapModel } from '../feature-map/model.js';
import { getMonorepoRoot } from '../utils/paths.js';
import { checkExtensionDist, extensionBuildCommand } from '../verify/preflight.js';
import { type VerifyCliOptions, resolveVerifyRun } from '../verify/resolve.js';
import {
  type VerifyRun,
  type VerifySummary,
  parseVerifySummary,
  verifyArtifacts,
  verifyExitCodes,
  verifyRunToEnv,
} from '../verify/verify-contract.js';

interface VerifyExtensionOptions extends VerifyCliOptions {
  readonly build?: boolean;
}

const app = 'extension';
const verifySpec = 'tests/verify/verify-screen.spec.ts';
const resultsDirName = 'verify-results';
const distDirName = 'dist';
const playwrightOverheadMs = 120_000;
const fixedRunSteps = 4;

function playwrightTimeout(run: VerifyRun): number {
  return run.timeout * (run.open.length + fixedRunSteps) + playwrightOverheadMs;
}

function fail(code: number, messages: readonly string[]): void {
  for (const message of messages) console.error(`verify: ${message}`);
  process.exitCode = code;
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function runPnpm(args: readonly string[], cwd: string, env?: NodeJS.ProcessEnv): number {
  const result = spawnSync('pnpm', args, { cwd, env, stdio: 'inherit' });
  if (result.error) return -1;
  return result.status ?? -1;
}

function readSummary(run: VerifyRun): VerifySummary | undefined {
  const file = path.join(run.outDir, verifyArtifacts.summary);
  if (!existsSync(file)) return undefined;
  try {
    return parseVerifySummary(readJson(file));
  } catch {
    return undefined;
  }
}

function printSummary(summary: VerifySummary): void {
  const report = [
    `verify: ${summary.verdict} (exit ${summary.exitCode}) for ${summary.run.label}`,
    `  evidence: ${toRepoRelative(summary.run.outDir)}`,
    ...summary.findings.map(finding => `  ${finding.kind}: ${finding.message}`),
  ].join('\n');
  if (summary.exitCode === verifyExitCodes.verified) {
    console.log(report);
    return;
  }
  console.error(report);
}

function verifyExtension(options: VerifyExtensionOptions): void {
  const config = getFeatureMapAppConfig(app);
  const model = buildFeatureMapModel(config);
  if (model.parseErrors.length > 0) {
    fail(verifyExitCodes.usage, model.parseErrors);
    return;
  }
  const resolved = resolveVerifyRun(options, {
    model,
    now: new Date(),
    resultsDir: path.join(config.appDir, resultsDirName),
    cwd: process.cwd(),
    readParams: readJson,
  });
  if (resolved.errors) {
    fail(verifyExitCodes.usage, resolved.errors);
    return;
  }
  const { run } = resolved;

  if (options.build) {
    const status = runPnpm(
      ['--filter', '@leather.io/extension', 'build:test'],
      getMonorepoRoot(),
      process.env
    );
    if (status !== 0) {
      fail(verifyExitCodes.env, [`${extensionBuildCommand} failed with exit code ${status}`]);
      return;
    }
  }

  const distErrors = checkExtensionDist(path.join(config.appDir, distDirName));
  if (distErrors.length > 0) {
    fail(verifyExitCodes.env, distErrors);
    return;
  }

  mkdirSync(run.outDir, { recursive: true });
  const status = runPnpm(
    [
      'exec',
      'playwright',
      'test',
      verifySpec,
      '--reporter=list',
      '--workers=1',
      '--retries=0',
      `--timeout=${playwrightTimeout(run)}`,
    ],
    config.appDir,
    { ...process.env, ...verifyRunToEnv(run) }
  );

  const summary = readSummary(run);
  if (!summary) {
    fail(verifyExitCodes.env, [
      `Playwright exited with code ${status} without writing ${verifyArtifacts.summary} to ${toRepoRelative(run.outDir)}`,
    ]);
    return;
  }
  printSummary(summary);
  process.exitCode = summary.exitCode;
}

export function registerVerifyCommands(program: Command): void {
  const verify = program
    .command('verify')
    .description(
      'Open a feature-map screen under its preconditions and report a verdict with evidence'
    );

  verify
    .command('extension')
    .description(
      'Open an extension feature-map entry or route, wait for its ready selector and write evidence. Exit 0 verified, 1 usage, 2 ready-not-met, 3 errors, 4 env'
    )
    .option('--feature <id>', 'feature-map entry id')
    .option('--route <path>', 'route to open, for example /send/btc')
    .option('--signed-in', 'seed an unlocked test wallet')
    .option('--signed-out', 'start without a wallet')
    .option('--locked', 'seed the test wallet, then lock it')
    .option('--account-type <type>', 'software, ledger, mixed or policy')
    .option('--network <id>', 'wallet network id, for example testnet4')
    .option('--flags <list>', 'flag overrides, for example a=true,b=false')
    .option('--mocks <mocks>', 'default, none or a comma-separated list of mock functions')
    .option('--ready <testId>', 'test id whose presence means the screen is usable')
    .option('--rpc <method>', 'send an rpc request from the test app: <method> or catalog:<id>')
    .option('--params <file>', 'JSON file with the rpc params')
    .option('--state <slices>', 'persisted slices for state.json, or all')
    .option('--connect-test-app', 'seed localhost:3000 as connected')
    .option('--no-connect-test-app', 'do not seed localhost:3000 as connected')
    .option('--allow-console-errors', 'do not fail the run on console errors')
    .option('--out <dir>', 'evidence directory')
    .option('--timeout <ms>', 'ready timeout in milliseconds (default 30000)')
    .option('--build', `run ${extensionBuildCommand} first`)
    .action(verifyExtension);
}
