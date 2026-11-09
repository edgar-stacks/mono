import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const manifestFile = 'manifest.json';
const productionManifestNames = new Set(['Leather', 'Leather Preview']);
const buildTestCommand = 'pnpm --filter @leather.io/extension build:test';

const manifestSchema = z.looseObject({ name: z.string() });

export function extensionDistDir(appDir: string): string {
  return path.join(appDir, 'dist');
}

export function checkExtensionDist(distDir: string): string | undefined {
  const manifestPath = path.join(distDir, manifestFile);
  if (!existsSync(manifestPath)) {
    return `no extension dist at ${distDir}; run ${buildTestCommand} or pass --build`;
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return `${manifestPath} is not JSON; rebuild with ${buildTestCommand}`;
  }
  const parsed = manifestSchema.safeParse(manifest);
  if (!parsed.success) return `${manifestPath} has no name; rebuild with ${buildTestCommand}`;
  if (productionManifestNames.has(parsed.data.name)) {
    return `${distDir} is a production build ('${parsed.data.name}'), not a build:test dist; run ${buildTestCommand} or pass --build`;
  }
  return undefined;
}

export function buildTestArgs(): string[] {
  return ['--filter', '@leather.io/extension', 'build:test'];
}
