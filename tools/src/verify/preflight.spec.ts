import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { checkExtensionDist } from './preflight.js';
import { backgroundErrorsStorageKey } from './verify-contract.js';

function makeDist(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'verify-dist-'));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), text);
  }
  return dir;
}

describe(checkExtensionDist.name, () => {
  test('reports a missing build', () => {
    const dir = path.join(tmpdir(), 'verify-no-such-dist');
    expect(checkExtensionDist(dir)).toEqual([
      `no extension build at ${dir}. Fix: run pnpm --filter @leather.io/extension build:test or pass --build.`,
    ]);
  });

  test('reports a build without the test error buffer', () => {
    const dir = makeDist({ 'manifest.json': '{}', 'assets/background.js': 'console.log(1)' });
    expect(checkExtensionDist(dir)[0]).toContain('is not a build:test dist of this branch');
  });

  test('accepts a build:test dist', () => {
    const dir = makeDist({
      'manifest.json': '{}',
      'assets/background.js': `const key = "${backgroundErrorsStorageKey}";`,
    });
    expect(checkExtensionDist(dir)).toEqual([]);
  });
});
