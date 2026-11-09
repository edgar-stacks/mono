import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import { checkExpoRoutes } from './expo-routes-check.js';
import { buildExpoRouterModel } from './expo-routes-parser.js';

const config = getFeatureMapAppConfig('mobile');
const appDir = config.expoRouter?.appDir ?? config.appDir;

describe(checkExpoRoutes.name, () => {
  test('passes when every screen has a key and every key a screen', () => {
    const routeUrls = new Map([['Activity', '/activity']]);
    const router = buildExpoRouterModel(
      [{ file: path.join(appDir, '(tabs)/activity.tsx'), path: '/activity' }],
      routeUrls,
      () => []
    );
    expect(checkExpoRoutes(config, router, routeUrls)).toEqual([]);
  });

  test('fails on a screen with no key and on a key with no screen', () => {
    const routeUrls = new Map([['Missing', '/missing']]);
    const router = buildExpoRouterModel(
      [{ file: path.join(appDir, 'unkeyed.tsx'), path: '/unkeyed' }],
      routeUrls,
      () => []
    );
    expect(checkExpoRoutes(config, router, routeUrls)).toEqual([
      [
        "screen apps/mobile/src/app/unkeyed.tsx ('/unkeyed') has no AppRoutes key.",
        "Fix: add a key with the value '/unkeyed' to AppRoutes in apps/mobile/src/shared/app-routes.ts, then claim it in an entry.",
      ].join('\n'),
      [
        "AppRoutes.Missing ('/missing') in apps/mobile/src/shared/app-routes.ts matches no screen file.",
        'Fix: point it at the path of a screen under apps/mobile/src/app or remove it.',
      ].join('\n'),
    ]);
  });
});
