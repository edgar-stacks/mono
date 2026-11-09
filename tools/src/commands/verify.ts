import type { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { getFeatureMapAppConfig, toRepoRelative } from '../feature-map/app-config.js';
import { buildFeatureMapModel } from '../feature-map/model.js';
import { getMonorepoRoot } from '../utils/paths.js';
import { buildTestArgs, checkExtensionDist, extensionDistDir } from '../verify/preflight.js';
import { type ProvidedParams, type VerifyOptions, resolveVerifyRun } from '../verify/resolve.js';
import {
  type VerifySummaryHead,
  makeEnvSummary,
  toVerifyEnv,
  verifyArtifacts,
  verifyExitCodes,
  verifySummarySchema,
} from '../verify/verify-contract.js';

interface VerifyCommandOptions extends VerifyOptions {
  readonly params?: string;
  readonly build?: boolean;
}

const verifySpec = 'tests/verify/verify-screen.spec.ts';

function failUsage(message: string): void {
  console.error(`verify: ${message}`);
  process.exitCode = verifyExitCodes.usage;
}

function invocationDir(): string {
  return process.env.INIT_CWD ?? process.cwd();
}

function readParams(file: string | undefined): ProvidedParams | string | undefined {
  if (file === undefined) return undefined;
  const resolved = path.resolve(invocationDir(), file);
  if (!existsSync(resolved)) return `--params ${file}: no such file`;
  try {
    const value: unknown = JSON.parse(readFileSync(resolved, 'utf8'));
    return { value };
  } catch (error) {
    return `--params ${file}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function readSummary(outDir: string): VerifySummaryHead | undefined {
  const file = path.join(outDir, verifyArtifacts.summary);
  if (!existsSync(file)) return undefined;
  try {
    const parsed = verifySummarySchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function writeEnvSummary(outDir: string, label: string, reason: string): VerifySummaryHead {
  const summary = makeEnvSummary(label, [reason]);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, verifyArtifacts.summary),
    `${JSON.stringify(summary, null, 2)}\n`
  );
  return summary;
}

function report(summary: VerifySummaryHead, outDir: string): void {
  const lines = [`verify: ${summary.verdict} (${summary.label})`];
  for (const reason of summary.reasons) lines.push(`  - ${reason}`);
  lines.push(`  evidence: ${toRepoRelative(outDir)}`);
  const print = summary.verdict === 'verified' ? console.log : console.error;
  print(lines.join('\n'));
  process.exitCode = verifyExitCodes[summary.verdict];
}

function verifyExtension(options: VerifyCommandOptions): void {
  const params = readParams(options.params);
  if (typeof params === 'string') return failUsage(params);

  const config = getFeatureMapAppConfig('extension');
  const model = buildFeatureMapModel(config);
  if (model.parseErrors.length > 0) {
    return failUsage(`feature map has parse errors:\n  ${model.parseErrors.join('\n  ')}`);
  }
  const out = options.out === undefined ? undefined : path.resolve(invocationDir(), options.out);
  const resolved = resolveVerifyRun(model, { ...options, out }, { now: new Date(), params });
  if (!resolved.ok) return failUsage(resolved.error);
  const { run } = resolved;

  if (options.build) {
    const build = spawnSync('pnpm', buildTestArgs(), { cwd: getMonorepoRoot(), stdio: 'inherit' });
    if (build.status !== 0) {
      return report(writeEnvSummary(run.outDir, run.label, '--build failed'), run.outDir);
    }
  }

  const distError = checkExtensionDist(extensionDistDir(config.appDir));
  if (distError) return report(writeEnvSummary(run.outDir, run.label, distError), run.outDir);

  mkdirSync(run.outDir, { recursive: true });
  const playwright = spawnSync(
    'pnpm',
    ['exec', 'playwright', 'test', verifySpec, '--workers=1', '--retries=0', '--reporter=line'],
    { cwd: config.appDir, stdio: 'inherit', env: { ...process.env, ...toVerifyEnv(run) } }
  );
  const summary =
    readSummary(run.outDir) ??
    writeEnvSummary(
      run.outDir,
      run.label,
      `Playwright exited with status ${String(playwright.status ?? playwright.signal)} before writing ${verifyArtifacts.summary}`
    );
  report(summary, run.outDir);
}

export function registerVerifyCommands(program: Command): void {
  const verify = program
    .command('verify')
    .description('Open a mapped screen under its preconditions and report a verdict with evidence');

  verify
    .command('extension')
    .description(
      'Verify an extension feature-map entry. Exit codes: 0 verified, 1 usage, 2 ready-not-met, 3 errors, 4 env'
    )
    .option('--feature <id>', 'Feature-map entry id')
    .option('--route <path>', 'Concrete route; resolves the entry that claims it')
    .option('--signed-in', 'Override the session: signed in')
    .option('--signed-out', 'Override the session: signed out')
    .option('--locked', 'Override the session: locked')
    .option('--account-type <type>', 'software, ledger, mixed or policy')
    .option('--network <id>', 'Wallet network id')
    .option('--flags <list>', 'LaunchDarkly overrides, for example a=true,b=false')
    .option('--mocks <mocks>', 'default, none or a comma-separated list of registered mocks')
    .option('--ready <testId>', 'Test id whose presence means the screen is usable')
    .option('--rpc <method>', 'RPC method, or catalog:<id> for a test-app catalog entry')
    .option('--params <file>', 'JSON file with the rpc params')
    .option('--state <slices>', 'Persisted slices to capture, comma-separated, or all')
    .option('--connect-test-app', 'Seed the test app on port 3000 as connected')
    .option('--no-connect-test-app', 'Do not seed the test app as connected')
    .option('--allow-console-errors', 'Do not fail on page or console errors')
    .option('--out <dir>', 'Evidence directory')
    .option('--timeout <ms>', 'Ready timeout in milliseconds (default 30000)')
    .option('--build', 'Run build:test first')
    .action(verifyExtension);
}
