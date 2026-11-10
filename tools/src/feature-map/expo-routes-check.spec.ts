import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import { checkExpoRoutes } from './expo-routes-check.js';
import { type FeatureMapModel } from './model.js';
import { type RoutedRoute } from './routers-parser.js';

const config = getFeatureMapAppConfig('mobile');
const appDir = config.expoRouter?.appDir ?? config.appDir;

function screen(file: string, mountedPath: string, keys: string[]): RoutedRoute {
  return {
    file: path.join(appDir, file),
    line: 1,
    keys,
    path: mountedPath,
    mountedPath,
    gates: ['splashScreen'],
    flags: [],
    parentKeys: [],
    isIndex: false,
  };
}

function model(
  routes: readonly RoutedRoute[],
  routeUrls: ReadonlyMap<string, string>,
  overrides: Partial<FeatureMapModel> = {}
): FeatureMapModel {
  return {
    config,
    routeUrls,
    selectorTable: new Map(),
    router: {
      routes,
      references: new Map(
        routes.flatMap(route =>
          route.keys.map(key => [key, [{ key, file: route.file, line: 1 }]] as const)
        )
      ),
      unresolved: [],
    },
    features: [],
    parseErrors: [],
    pageObjectActions: new Map(),
    mocks: new Map(),
    setupMocks: undefined,
    specs: new Map(),
    flags: [],
    rpcMethods: new Set(),
    selectorObjects: new Map(),
    rpcHandlers: new Map(),
    ...overrides,
  };
}

const home = screen('(tabs)/(index)/index.tsx', '/', ['Home']);
const activity = screen('(tabs)/activity.tsx', '/activity', ['Activity']);

describe(checkExpoRoutes.name, () => {
  test('passes when every screen has a key and every key has a screen', () => {
    const routeUrls = new Map([
      ['Home', '/'],
      ['Activity', '/activity'],
    ]);
    expect(checkExpoRoutes(model([home, activity], routeUrls))).toEqual([]);
  });

  test('fails on a screen file with no AppRoutes key', () => {
    const unkeyed = screen('new-screen.tsx', '/new-screen', []);
    const errors = checkExpoRoutes(model([home, unkeyed], new Map([['Home', '/']])));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(
      "screen apps/mobile/src/app/new-screen.tsx mounts '/new-screen' but no AppRoutes key has that value."
    );
    expect(errors[0]).toContain(
      "Fix: add a key with the value '/new-screen' to AppRoutes in apps/mobile/src/shared/app-routes.ts"
    );
  });

  test('fails on an AppRoutes key with no screen file', () => {
    const routeUrls = new Map([
      ['Home', '/'],
      ['Gone', '/gone'],
    ]);
    const errors = checkExpoRoutes(model([home], routeUrls));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(
      "AppRoutes.Gone ('/gone') in apps/mobile/src/shared/app-routes.ts matches no screen file under apps/mobile/src/app."
    );
  });

  test('does nothing for an app without expo-router config', () => {
    const extension = getFeatureMapAppConfig('extension');
    const unkeyed = screen('new-screen.tsx', '/new-screen', []);
    expect(
      checkExpoRoutes(model([unkeyed], new Map([['Gone', '/gone']]), { config: extension }))
    ).toEqual([]);
  });
});
