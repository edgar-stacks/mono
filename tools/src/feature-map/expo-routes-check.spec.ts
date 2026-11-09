import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import { checkExpoRoutes } from './expo-routes-check.js';
import { type RoutedRoute, type RouterModel } from './routers-parser.js';

const config = getFeatureMapAppConfig('mobile');
const appDir = path.join(config.appDir, 'src/app');

function screen(relative: string, mountedPath: string, keys: string[]): RoutedRoute {
  return {
    file: path.join(appDir, relative),
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

function router(routes: RoutedRoute[]): RouterModel {
  const references = new Map(
    routes.flatMap(route => route.keys.map(key => [key, [{ key, file: route.file, line: 1 }]]))
  );
  return { routes, references, unresolved: [] };
}

function check(routes: RoutedRoute[], routeUrls: Map<string, string>) {
  return checkExpoRoutes({
    routeUrlsFile: config.routeUrlsFile,
    routeUrlsObjectName: config.routeUrlsObjectName,
    routeUrls,
    router: router(routes),
  });
}

describe(checkExpoRoutes.name, () => {
  test('passes when every screen has a key and every key a screen', () => {
    expect(
      check(
        [screen('(tabs)/activity.tsx', '/activity', ['Activity'])],
        new Map([['Activity', '/activity']])
      )
    ).toEqual([]);
  });

  test('fails on a screen file with no AppRoutes key', () => {
    const errors = check([screen('new-screen.tsx', '/new-screen', [])], new Map());
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(
      "screen apps/mobile/src/app/new-screen.tsx ('/new-screen') has no AppRoutes key."
    );
    expect(errors[0]).toContain(
      "Fix: add a key with the value '/new-screen' to AppRoutes in apps/mobile/src/shared/app-routes.ts"
    );
  });

  test('fails on an AppRoutes key that matches no screen file', () => {
    const errors = check([], new Map([['Gone', '/gone']]));
    expect(errors).toEqual([
      "AppRoutes.Gone ('/gone') in apps/mobile/src/shared/app-routes.ts matches no screen file.\nFix: rename it to the path of an expo-router screen or remove it.",
    ]);
  });
});
