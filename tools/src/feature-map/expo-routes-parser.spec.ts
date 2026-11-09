import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  expoRoutePath,
  isExpoScreenFile,
  layoutGates,
  parseExpoRoutes,
} from './expo-routes-parser.js';
import { parseSourceFile } from './ts-ast.js';

function writeFile(root: string, relative: string, text: string) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

describe(expoRoutePath.name, () => {
  test('drops the extension, index and group segments', () => {
    expect(expoRoutePath('(tabs)/activity.tsx')).toBe('/activity');
    expect(expoRoutePath('(tabs)/(index)/[assetId]/index.tsx')).toBe('/[assetId]');
    expect(expoRoutePath('(tabs)/(index)/index.tsx')).toBe('/');
    expect(expoRoutePath('settings/wallet/configure/[wallet]/view-secret-key.tsx')).toBe(
      '/settings/wallet/configure/[wallet]/view-secret-key'
    );
  });
});

describe(isExpoScreenFile.name, () => {
  test('excludes layouts, special files and specs', () => {
    expect(isExpoScreenFile('settings/index.tsx')).toBe(true);
    expect(isExpoScreenFile('(tabs)/_layout.tsx')).toBe(false);
    expect(isExpoScreenFile('+not-found.tsx')).toBe(false);
    expect(isExpoScreenFile('settings/index.spec.tsx')).toBe(false);
    expect(isExpoScreenFile('settings/notes.md')).toBe(false);
  });
});

describe(layoutGates.name, () => {
  test('maps the gate components the layouts render, outermost first and once each', () => {
    const files = new Map([
      ['root', '<Guard><Outer><App /></Outer></Guard>'],
      ['inner', '<Guard><Stack /></Guard>'],
    ]);
    function read(file: string) {
      const text = files.get(file);
      if (text === undefined) throw new Error(`no layout ${file}`);
      return parseSourceFile(`${file}.tsx`, text);
    }
    const gates = layoutGates(['root', 'inner'], { Guard: 'guard', Outer: 'outer' }, read);
    expect(gates).toEqual(['guard', 'outer']);
  });
});

describe(parseExpoRoutes.name, () => {
  test('lists every screen with its path, AppRoutes keys and layout gates', () => {
    const appDir = mkdtempSync(path.join(tmpdir(), 'expo-routes-'));
    writeFile(
      appDir,
      '_layout.tsx',
      'export default () => <SplashScreenGuard><Stack /></SplashScreenGuard>;'
    );
    writeFile(appDir, '(tabs)/_layout.tsx', 'export default TabLayout;');
    writeFile(appDir, '(tabs)/activity.tsx', 'export default () => null;');
    writeFile(appDir, '(tabs)/(index)/index.tsx', 'export default () => null;');
    writeFile(appDir, 'unkeyed.tsx', 'export default () => null;');
    writeFile(appDir, '+not-found.tsx', 'export default () => null;');

    const model = parseExpoRoutes(
      { appDir, gateComponents: { SplashScreenGuard: 'splashScreen' } },
      new Map([
        ['Home', '/'],
        ['Activity', '/activity'],
      ])
    );

    expect(model.routes.map(route => [route.mountedPath, route.keys, route.gates])).toEqual([
      ['/', ['Home'], ['splashScreen']],
      ['/activity', ['Activity'], ['splashScreen']],
      ['/unkeyed', [], ['splashScreen']],
    ]);
    expect([...model.references.keys()].sort()).toEqual(['Activity', 'Home']);
    expect(model.unresolved).toEqual([]);
  });
});
