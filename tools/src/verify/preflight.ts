import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { backgroundErrorsStorageKey } from './verify-contract.js';

const manifestFile = 'manifest.json';
const scriptPattern = /\.js$/;

export const extensionBuildCommand = 'pnpm --filter @leather.io/extension build:test';

function listScripts(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && scriptPattern.test(entry.name))
    .map(entry => path.join(entry.parentPath, entry.name));
}

function hasTestErrorBuffer(distDir: string): boolean {
  return listScripts(distDir).some(file =>
    readFileSync(file, 'utf8').includes(backgroundErrorsStorageKey)
  );
}

export function checkExtensionDist(distDir: string): string[] {
  if (!existsSync(path.join(distDir, manifestFile))) {
    return [`no extension build at ${distDir}. Fix: run ${extensionBuildCommand} or pass --build.`];
  }
  if (!hasTestErrorBuffer(distDir)) {
    return [
      `${distDir} is not a build:test dist of this branch: no script records ${backgroundErrorsStorageKey}. Fix: run ${extensionBuildCommand} or pass --build.`,
    ];
  }
  return [];
}
