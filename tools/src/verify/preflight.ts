import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const manifestFile = 'manifest.json';
const productionManifestNames = new Set(['Leather', 'Leather Preview']);
const launchDarklyKey = 'LAUNCH_DARKLY_KEY';

type PreflightResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

interface DistPreflightInput {
  readonly distDir: string;
  readonly displayDir: string;
}

function readManifestName(file: string): string | undefined {
  try {
    const manifest: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (typeof manifest !== 'object' || manifest === null || !('name' in manifest))
      return undefined;
    return typeof manifest.name === 'string' ? manifest.name : undefined;
  } catch {
    return undefined;
  }
}

export function checkExtensionDist({ distDir, displayDir }: DistPreflightInput): PreflightResult {
  const manifest = path.join(distDir, manifestFile);
  const rebuild = 'Run pnpm --filter @leather.io/extension build:test, or pass --build.';
  if (!existsSync(manifest)) {
    return { ok: false, error: `no extension build in ${displayDir}. ${rebuild}` };
  }
  const name = readManifestName(manifest);
  if (name === undefined) {
    return { ok: false, error: `${displayDir}/${manifestFile} has no name. ${rebuild}` };
  }
  if (productionManifestNames.has(name)) {
    return {
      ok: false,
      error: `${displayDir} is a production build ('${name}'), not a build:test dist. ${rebuild}`,
    };
  }
  return { ok: true };
}

function readEnvKeys(text: string): Map<string, string> {
  const keys = new Map<string, string>();
  for (const line of text.split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match?.[1]) continue;
    keys.set(match[1], (match[2] ?? '').trim().replace(/^['"]|['"]$/g, ''));
  }
  return keys;
}

interface FlagPreflightInput {
  readonly envFile: string;
  readonly displayFile: string;
  readonly flags: Readonly<Record<string, boolean>>;
}

export function checkFlagOverrides({
  envFile,
  displayFile,
  flags,
}: FlagPreflightInput): PreflightResult {
  if (Object.keys(flags).length === 0) return { ok: true };
  const text = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
  if (readEnvKeys(text).get(launchDarklyKey)) return { ok: true };
  return {
    ok: false,
    error: `flag overrides need ${launchDarklyKey} in ${displayFile}; without it the build never asks LaunchDarkly for flags. Add it and rebuild with build:test.`,
  };
}
