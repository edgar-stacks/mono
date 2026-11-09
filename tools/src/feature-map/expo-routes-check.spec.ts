import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { type ExpoRouterConfig, getFeatureMapAppConfig } from './app-config.js';
import { checkExpoRoutes } from './expo-routes-check.js';
import { buildExpoRouterModel } from './expo-routes-parser.js';
import { type FeatureMapModel, buildFeatureMapModel } from './model.js';

const config = getFeatureMapAppConfig('mobile');

function mobileExpoRouter(): ExpoRouterConfig {
  if (!config.expoRouter)
    throw new Error('the mobile feature-map config has no expoRouter section');
  return config.expoRouter;
}

const { appDir } = mobileExpoRouter();
const base = buildFeatureMapModel(config);

function withScreens(
  screens: readonly { file: string; path: string }[],
  routeUrls: ReadonlyMap<string, string>
): FeatureMapModel {
  return {
    ...base,
    routeUrls,
    router: buildExpoRouterModel(
      screens.map(screen => ({ ...screen, gates: ['splashScreen'] })),
      routeUrls
    ),
  };
}

describe(checkExpoRoutes.name, () => {
  test('passes on the mobile app', () => {
    expect(checkExpoRoutes(base)).toEqual([]);
  });

  test('fails on a screen file with no AppRoutes key', () => {
    const errors = checkExpoRoutes(
      withScreens(
        [
          { file: path.join(appDir, 'settings/index.tsx'), path: '/settings' },
          { file: path.join(appDir, 'settings/new-screen.tsx'), path: '/settings/new-screen' },
        ],
        new Map([['Settings', '/settings']])
      )
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(
      "screen apps/mobile/src/app/settings/new-screen.tsx ('/settings/new-screen') has no AppRoutes key."
    );
    expect(errors[0]).toContain(
      "Fix: add a key with the value '/settings/new-screen' to AppRoutes in apps/mobile/src/shared/app-routes.ts"
    );
  });

  test('fails on an AppRoutes key with no screen file', () => {
    const errors = checkExpoRoutes(
      withScreens(
        [{ file: path.join(appDir, 'settings/index.tsx'), path: '/settings' }],
        new Map([
          ['Settings', '/settings'],
          ['Removed', '/removed'],
        ])
      )
    );
    expect(errors).toEqual([
      "AppRoutes.Removed ('/removed') matches no screen file under apps/mobile/src/app.\nFix: remove the key from apps/mobile/src/shared/app-routes.ts or correct its value to the screen's path.",
    ]);
  });

  test('does not apply to an app without expo-router', () => {
    const extension = getFeatureMapAppConfig('extension');
    expect(checkExpoRoutes({ ...base, config: extension })).toEqual([]);
  });
});
