import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { checkExtensionDist, checkFlagOverrides } from './preflight.js';

const tempDir = mkdtempSync(path.join(tmpdir(), 'verify-preflight-'));

function errorOf(result: { ok: true } | { ok: false; error: string }) {
  return result.ok ? undefined : result.error;
}

function distWith(name: string, manifest?: unknown) {
  const distDir = path.join(tempDir, name);
  mkdirSync(distDir, { recursive: true });
  if (manifest !== undefined) {
    writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest));
  }
  return { distDir, displayDir: `apps/extension/${name}` };
}

describe(checkExtensionDist.name, () => {
  test('accepts a non-production build', () => {
    expect(checkExtensionDist(distWith('test-dist', { name: 'Leather Dev' }))).toEqual({
      ok: true,
    });
  });

  test('rejects a missing dist, an unreadable manifest and a production build', () => {
    expect(checkExtensionDist(distWith('empty-dist'))).toEqual({
      ok: false,
      error:
        'no extension build in apps/extension/empty-dist. Run pnpm --filter @leather.io/extension build:test, or pass --build.',
    });
    expect(errorOf(checkExtensionDist(distWith('nameless-dist', {})))).toContain(
      'manifest.json has no name'
    );
    expect(errorOf(checkExtensionDist(distWith('prod-dist', { name: 'Leather' })))).toContain(
      "is a production build ('Leather'), not a build:test dist"
    );
  });
});

describe(checkFlagOverrides.name, () => {
  function envFile(name: string, text: string) {
    const file = path.join(tempDir, name);
    writeFileSync(file, text);
    return file;
  }

  test('needs LAUNCH_DARKLY_KEY only when the run overrides flags', () => {
    const missing = path.join(tempDir, 'missing.env');
    expect(checkFlagOverrides({ envFile: missing, displayFile: '.env', flags: {} })).toEqual({
      ok: true,
    });
    expect(
      errorOf(
        checkFlagOverrides({ envFile: missing, displayFile: '.env', flags: { releaseX: true } })
      )
    ).toContain('LAUNCH_DARKLY_KEY in .env');
    expect(
      checkFlagOverrides({
        envFile: envFile('empty-key.env', 'LAUNCH_DARKLY_KEY=\nOTHER=1\n'),
        displayFile: '.env',
        flags: { releaseX: true },
      }).ok
    ).toBe(false);
    expect(
      checkFlagOverrides({
        envFile: envFile('with-key.env', 'OTHER=1\nLAUNCH_DARKLY_KEY="abc"\n'),
        displayFile: '.env',
        flags: { releaseX: false },
      })
    ).toEqual({ ok: true });
  });
});
