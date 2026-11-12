import type { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { getFeatureMapAppConfig, toRepoRelative } from '../feature-map/app-config.js';
import { buildFeatureMapModel } from '../feature-map/model.js';
import { checkExtensionDist, checkFlagOverrides } from '../verify/preflight.js';
import { type VerifyCliOptions, resolveVerifyRun } from '../verify/resolve.js';
import {
  type VerifyVerdict,
  parseVerifySummary,
  verifyArtifacts,
  verifyExitCodes,
  verifyPlanEnv,
} from '../verify/verify-contract.js';

interface VerifyCommandOptions extends VerifyCliOptions {
  readonly build?: boolean;
}

const app = 'extension';

function exitWith(verdict: VerifyVerdict, message: string): void {
  console.error(`verify: ${verdict}: ${message}`);
  process.exitCode = verifyExitCodes[verdict];
}

function runPnpm(args: readonly string[], cwd: string, env?: NodeJS.ProcessEnv): number | null {
  const result = spawnSync('pnpm', args, { cwd, env, stdio: 'inherit' });
  return result.error ? null : result.status;
}

function verifyExtension(options: VerifyCommandOptions): void {
  const config = getFeatureMapAppConfig(app);
  const model = buildFeatureMapModel(config);
  if (model.parseErrors.length > 0) {
    exitWith('usage', `feature-map sources have errors; run pnpm lt feature-map check`);
    return;
  }
  const resolved = resolveVerifyRun(model, options, {
    cwd: process.env.INIT_CWD ?? process.cwd(),
    now: new Date(),
    readParamsFile: file => readFileSync(file, 'utf8'),
  });
  if (!resolved.ok) {
    exitWith('usage', resolved.error);
    return;
  }
  const { plan, outDir } = resolved;

  if (options.build) {
    console.log('verify: building the extension with build:test');
    const status = runPnpm(['--filter', '@leather.io/extension', 'build:test'], config.appDir);
    if (status !== 0) {
      exitWith('env', 'build:test failed');
      return;
    }
  }

  const dist = checkExtensionDist({
    distDir: config.distDir,
    displayDir: toRepoRelative(config.distDir),
  });
  if (!dist.ok) {
    exitWith('env', dist.error);
    return;
  }
  const flags = checkFlagOverrides({
    envFile: config.envFile,
    displayFile: toRepoRelative(config.envFile),
    flags: plan.flags,
  });
  if (!flags.ok) {
    exitWith('env', flags.error);
    return;
  }

  mkdirSync(outDir, { recursive: true });
  console.log(`verify: ${plan.label} → ${toRepoRelative(outDir)}`);
  const status = runPnpm(
    [
      'exec',
      'playwright',
      'test',
      path.relative(config.appDir, config.verifySpecFile),
      '--reporter=list',
      '--workers=1',
      '--retries=0',
    ],
    config.appDir,
    { ...process.env, ...verifyPlanEnv(plan, outDir) }
  );

  const summaryFile = path.join(outDir, verifyArtifacts.summary);
  const summary = existsSync(summaryFile)
    ? parseVerifySummary(readFileSync(summaryFile, 'utf8'))
    : undefined;
  if (!summary) {
    exitWith(
      'env',
      `Playwright exited with ${status ?? 'no status'} before writing ${toRepoRelative(summaryFile)}`
    );
    return;
  }
  const lines = [
    `verify: ${summary.verdict} (exit ${summary.exitCode}) for ${summary.label}`,
    ...summary.reasons.map(reason => `  - ${reason}`),
    `  artifacts: ${toRepoRelative(outDir)}/ (${summary.artifacts.join(', ')})`,
  ];
  const print = summary.verdict === 'verified' ? console.log : console.error;
  print(lines.join('\n'));
  process.exitCode = summary.exitCode;
}

export function registerVerifyCommands(program: Command): void {
  const verify = program
    .command('verify')
    .description('Open a feature-map screen under its preconditions and report a verdict');

  verify
    .command(app)
    .description(
      'Open an extension feature-map entry, wait for its ready selector and write evidence. Exit 0 verified, 1 usage, 2 ready-not-met, 3 errors, 4 env'
    )
    .option('--feature <id>', 'Feature-map entry id')
    .option('--route <path>', 'Route path or RouteUrls key an entry claims')
    .option('--signed-in', 'Seed an unlocked wallet')
    .option('--signed-out', 'Start with no wallet')
    .option('--locked', 'Seed a wallet and lock it')
    .option('--account-type <type>', 'software, ledger, mixed or policy')
    .option('--network <id>', 'Wallet network id, for example mainnet or testnet4')
    .option('--flags <list>', 'Flag overrides, for example releaseX=true,releaseY=false')
    .option('--mocks <mode>', "'default', 'none' or a comma-separated list of registered mocks")
    .option('--ready <testId>', 'Test id whose presence means the screen is ready')
    .option('--rpc <method>', 'RPC method to send from the test app, or catalog:<id>')
    .option('--params <file>', 'JSON file with the rpc params')
    .option('--state <slices>', "Persisted slices for state.json, or 'all'")
    .option('--connect-test-app', 'Seed localhost:3000 as a connected app')
    .option('--no-connect-test-app', 'Do not seed localhost:3000 as connected')
    .option('--allow-console-errors', 'Do not fail on console errors')
    .option('--out <dir>', 'Artifact directory')
    .option('--timeout <ms>', 'Ready timeout in milliseconds (default 30000)')
    .option('--build', 'Run build:test first')
    .action(verifyExtension);
}
