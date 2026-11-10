import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import { expoRoutePath, layoutFilesAbove, parseExpoRoutes } from './expo-routes-parser.js';
import { loadRouteUrls } from './test-assets.js';

function writeTree(root: string, files: Readonly<Record<string, string>>) {
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), text);
  }
}

const screen = 'export default function Screen() { return <View />; }';

describe(expoRoutePath.name, () => {
  test.each([
    ['(tabs)/activity.tsx', '/activity'],
    ['(tabs)/(index)/index.tsx', '/'],
    ['(tabs)/(index)/[assetId]/index.tsx', '/[assetId]'],
    ['settings/index.tsx', '/settings'],
    [
      'settings/wallet/configure/[wallet]/view-secret-key.tsx',
      '/settings/wallet/configure/[wallet]/view-secret-key',
    ],
    ['create-new-wallet.tsx', '/create-new-wallet'],
  ])('maps %s to %s', (file, expected) => {
    expect(expoRoutePath(file)).toBe(expected);
  });
});

describe(parseExpoRoutes.name, () => {
  const appDir = mkdtempSync(path.join(tmpdir(), 'feature-map-expo-'));
  writeTree(appDir, {
    '_layout.tsx':
      'export default function Root() { return <SplashScreenGuard><Stack /></SplashScreenGuard>; }',
    '+not-found.tsx': screen,
    '(tabs)/_layout.tsx': 'export default TabLayout;',
    '(tabs)/(index)/index.tsx': screen,
    '(tabs)/activity.tsx': screen,
    'settings/_layout.tsx':
      'export default function L() { return <LockGuard><Stack /></LockGuard>; }',
    'settings/index.tsx': screen,
    'settings/index.spec.tsx': 'test("x", () => {});',
    'orphan.tsx': screen,
  });
  const routeUrls = new Map([
    ['Home', '/'],
    ['Activity', '/activity'],
    ['Settings', '/settings'],
  ]);
  const gateComponents = { SplashScreenGuard: 'splashScreen', LockGuard: 'lock' };
  const model = parseExpoRoutes({ appDir, gateComponents }, routeUrls);

  test('lists every screen file but layouts, +files and specs, with its path', () => {
    expect(model.routes.map(route => route.mountedPath).sort()).toEqual([
      '/',
      '/activity',
      '/orphan',
      '/settings',
    ]);
  });

  test('keys each screen by the AppRoutes values equal to its path', () => {
    const byPath = new Map(model.routes.map(route => [route.mountedPath, route]));
    expect(byPath.get('/')?.keys).toEqual(['Home']);
    expect(byPath.get('/orphan')?.keys).toEqual([]);
    expect(model.references.get('Settings')).toEqual([
      { key: 'Settings', file: path.join(appDir, 'settings/index.tsx'), line: 1 },
    ]);
    expect(model.unresolved).toEqual([]);
  });

  test('takes gates from the components the layouts above a screen render, outermost first', () => {
    const byPath = new Map(model.routes.map(route => [route.mountedPath, route]));
    expect(byPath.get('/activity')?.gates).toEqual(['splashScreen']);
    expect(byPath.get('/settings')?.gates).toEqual(['splashScreen', 'lock']);
  });

  test('finds the layouts from the app root down to the screen directory', () => {
    expect(layoutFilesAbove(appDir, path.join(appDir, '(tabs)/(index)/index.tsx'))).toEqual([
      path.join(appDir, '_layout.tsx'),
      path.join(appDir, '(tabs)/_layout.tsx'),
    ]);
  });

  test('keys every mobile screen behind the splash screen guard', () => {
    const config = getFeatureMapAppConfig('mobile');
    if (!config.expoRouter) throw new Error('mobile has no expoRouter config');
    const mobile = parseExpoRoutes(config.expoRouter, loadRouteUrls(config));
    expect(mobile.routes.length).toBeGreaterThan(0);
    expect(mobile.routes.filter(route => route.keys.length === 0)).toEqual([]);
    expect(mobile.routes.every(route => route.gates.includes('splashScreen'))).toBe(true);
  });
});
