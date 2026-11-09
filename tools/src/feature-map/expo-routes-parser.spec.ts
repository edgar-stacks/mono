import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  buildExpoRouterModel,
  expoScreenPath,
  isExpoScreenFile,
  layoutFilesAbove,
  layoutGates,
  loadExpoScreens,
  parseExpoRoutes,
} from './expo-routes-parser.js';
import { parseSourceFile } from './ts-ast.js';

const tempDir = mkdtempSync(path.join(tmpdir(), 'feature-map-expo-'));

function writeFiles(root: string, files: Record<string, string>) {
  for (const [file, text] of Object.entries(files)) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
}

const gateComponents = { SplashScreenGuard: 'splashScreen' };

describe(expoScreenPath.name, () => {
  test('drops the extension, index and (group) segments', () => {
    expect(expoScreenPath('(tabs)/activity.tsx')).toBe('/activity');
    expect(expoScreenPath('(tabs)/(index)/[assetId]/index.tsx')).toBe('/[assetId]');
    expect(expoScreenPath('(tabs)/(index)/index.tsx')).toBe('/');
    expect(expoScreenPath('settings/wallet/configure/[wallet]/view-secret-key.tsx')).toBe(
      '/settings/wallet/configure/[wallet]/view-secret-key'
    );
  });
});

describe(isExpoScreenFile.name, () => {
  test('skips layouts, special files and specs', () => {
    expect(isExpoScreenFile('settings/index.tsx')).toBe(true);
    expect(isExpoScreenFile('_layout.tsx')).toBe(false);
    expect(isExpoScreenFile('(tabs)/_layout.tsx')).toBe(false);
    expect(isExpoScreenFile('+not-found.tsx')).toBe(false);
    expect(isExpoScreenFile('settings/index.spec.tsx')).toBe(false);
    expect(isExpoScreenFile('settings/readme.md')).toBe(false);
  });
});

describe(loadExpoScreens.name, () => {
  test('lists every screen file under the app dir with its path', () => {
    const appDir = path.join(tempDir, 'screens');
    writeFiles(appDir, {
      '_layout.tsx': '',
      '+not-found.tsx': '',
      '(tabs)/_layout.tsx': '',
      '(tabs)/activity.tsx': '',
      '(tabs)/(index)/index.tsx': '',
      'settings/index.tsx': '',
      'settings/index.spec.tsx': '',
    });
    const screens = loadExpoScreens(appDir).map(screen => [
      path.relative(appDir, screen.file),
      screen.path,
    ]);
    expect(screens).toEqual([
      [path.join('(tabs)', '(index)', 'index.tsx'), '/'],
      [path.join('(tabs)', 'activity.tsx'), '/activity'],
      [path.join('settings', 'index.tsx'), '/settings'],
    ]);
  });
});

describe(layoutGates.name, () => {
  test('maps the gate components the layouts above a screen render, outermost first', () => {
    const appDir = path.join(tempDir, 'gates');
    writeFiles(appDir, {
      '_layout.tsx':
        'export default function Root() { return <SplashScreenGuard><App /></SplashScreenGuard>; }',
      '(tabs)/_layout.tsx': "export { TabLayout as default } from './tab-layout';",
      '(tabs)/activity.tsx': '',
      'settings/index.tsx': '',
    });
    const layouts = layoutFilesAbove(appDir, path.join(appDir, '(tabs)/activity.tsx'));
    expect(layouts.map(file => path.relative(appDir, file))).toEqual([
      '_layout.tsx',
      path.join('(tabs)', '_layout.tsx'),
    ]);
    expect(
      layoutGates(
        layouts.map(file => parseSourceFile(file)),
        gateComponents
      )
    ).toEqual(['splashScreen']);
    expect(layoutGates([], gateComponents)).toEqual([]);
  });
});

describe(buildExpoRouterModel.name, () => {
  test('keys each screen by the route value that equals its path', () => {
    const screens = [
      { file: '/app/(tabs)/activity.tsx', path: '/activity' },
      { file: '/app/orphan.tsx', path: '/orphan' },
    ];
    const routeUrls = new Map([
      ['Activity', '/activity'],
      ['Missing', '/missing'],
    ]);
    const router = buildExpoRouterModel(screens, routeUrls, () => ['splashScreen']);
    expect(router.routes.map(route => [route.mountedPath, route.keys, route.gates])).toEqual([
      ['/activity', ['Activity'], ['splashScreen']],
      ['/orphan', [], ['splashScreen']],
    ]);
    expect([...router.references.keys()]).toEqual(['Activity']);
    expect(router.unresolved).toEqual([]);
  });
});

describe(parseExpoRoutes.name, () => {
  test('puts every mobile screen behind the splash screen guard', () => {
    const appDir = path.join(tempDir, 'parsed');
    writeFiles(appDir, {
      '_layout.tsx':
        'export default function Root() { return <SplashScreenGuard><App /></SplashScreenGuard>; }',
      'settings/index.tsx': '',
    });
    const router = parseExpoRoutes(
      { appDir, gateComponents },
      new Map([['Settings', '/settings']])
    );
    expect(router.routes.map(route => [route.keys, route.gates])).toEqual([
      [['Settings'], ['splashScreen']],
    ]);
  });
});
