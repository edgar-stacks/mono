import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  buildExpoRouterModel,
  collectGateComponents,
  expoRoutePath,
  loadExpoScreens,
} from './expo-routes-parser.js';
import { parseSourceFile } from './ts-ast.js';

const gateComponents = { SplashScreenGuard: 'splashScreen' };

function writeFile(root: string, relative: string, text: string) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

describe(expoRoutePath.name, () => {
  test('drops the extension, index segments and route groups', () => {
    expect(expoRoutePath('(tabs)/activity.tsx')).toBe('/activity');
    expect(expoRoutePath('(tabs)/(index)/index.tsx')).toBe('/');
    expect(expoRoutePath('(tabs)/(index)/[assetId]/index.tsx')).toBe('/[assetId]');
    expect(expoRoutePath('settings/index.tsx')).toBe('/settings');
    expect(expoRoutePath('settings/wallet/configure/[wallet]/view-secret-key.tsx')).toBe(
      '/settings/wallet/configure/[wallet]/view-secret-key'
    );
  });

  test('skips layouts, special files and specs', () => {
    expect(expoRoutePath('_layout.tsx')).toBeUndefined();
    expect(expoRoutePath('(tabs)/_layout.tsx')).toBeUndefined();
    expect(expoRoutePath('+not-found.tsx')).toBeUndefined();
    expect(expoRoutePath('settings/index.spec.tsx')).toBeUndefined();
    expect(expoRoutePath('settings/readme.md')).toBeUndefined();
  });
});

describe(collectGateComponents.name, () => {
  test('maps the gate components a layout renders', () => {
    const sourceFile = parseSourceFile(
      '_layout.tsx',
      `export default function Layout() {
        return <Provider><SplashScreenGuard><App /></SplashScreenGuard><Other /></Provider>;
      }`
    );
    expect(collectGateComponents(sourceFile, gateComponents)).toEqual(['splashScreen']);
  });

  test('finds nothing in a layout without a gate', () => {
    const sourceFile = parseSourceFile('_layout.tsx', 'export { TabLayout as default };');
    expect(collectGateComponents(sourceFile, gateComponents)).toEqual([]);
  });
});

describe(loadExpoScreens.name, () => {
  test('derives each screen path and the gates of the layouts above it', () => {
    const appDir = mkdtempSync(path.join(tmpdir(), 'feature-map-expo-'));
    writeFile(
      appDir,
      '_layout.tsx',
      'export default () => <SplashScreenGuard><Stack /></SplashScreenGuard>;'
    );
    writeFile(appDir, '(tabs)/_layout.tsx', 'export default () => <Tabs />;');
    writeFile(appDir, '(tabs)/activity.tsx', 'export default () => null;');
    writeFile(appDir, '(tabs)/(index)/index.tsx', 'export default () => null;');
    writeFile(appDir, 'settings/index.tsx', 'export default () => null;');
    writeFile(appDir, 'settings/index.spec.tsx', '');
    writeFile(appDir, '+not-found.tsx', 'export default () => null;');

    const screens = loadExpoScreens({ appDir, gateComponents });

    expect(screens.map(screen => [path.relative(appDir, screen.file), screen.path])).toEqual([
      [path.join('(tabs)', '(index)', 'index.tsx'), '/'],
      [path.join('(tabs)', 'activity.tsx'), '/activity'],
      [path.join('settings', 'index.tsx'), '/settings'],
    ]);
    expect(screens.every(screen => screen.gates.join() === 'splashScreen')).toBe(true);
  });
});

describe(buildExpoRouterModel.name, () => {
  test('keys each screen by the AppRoutes values equal to its path', () => {
    const model = buildExpoRouterModel(
      [
        { file: '/app/(tabs)/activity.tsx', path: '/activity', gates: ['splashScreen'] },
        { file: '/app/settings/index.tsx', path: '/settings', gates: ['splashScreen'] },
      ],
      new Map([
        ['Activity', '/activity'],
        ['Unused', '/unused'],
      ])
    );

    expect(model.routes.map(route => [route.mountedPath, route.keys])).toEqual([
      ['/activity', ['Activity']],
      ['/settings', []],
    ]);
    expect(model.routes[0]?.gates).toEqual(['splashScreen']);
    expect([...model.references.keys()]).toEqual(['Activity']);
    expect(model.unresolved).toEqual([]);
  });
});
