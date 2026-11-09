import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { checkExtensionDist } from './preflight.js';

const tempDir = mkdtempSync(path.join(tmpdir(), 'verify-preflight-'));

function distWith(name: string, manifest?: string): string {
  const dir = path.join(tempDir, name);
  mkdirSync(dir, { recursive: true });
  if (manifest !== undefined) writeFileSync(path.join(dir, 'manifest.json'), manifest);
  return dir;
}

describe(checkExtensionDist.name, () => {
  test('accepts a non-production dist', () => {
    expect(checkExtensionDist(distWith('test', '{"name":"Leather Dev"}'))).toBeUndefined();
  });

  test('rejects a missing dist, a broken manifest and a production build', () => {
    expect(checkExtensionDist(path.join(tempDir, 'missing'))).toContain('no extension dist');
    expect(checkExtensionDist(distWith('broken', '{'))).toContain('is not JSON');
    expect(checkExtensionDist(distWith('nameless', '{}'))).toContain('has no name');
    expect(checkExtensionDist(distWith('production', '{"name":"Leather"}'))).toContain(
      "is a production build ('Leather'), not a build:test dist"
    );
  });
});
