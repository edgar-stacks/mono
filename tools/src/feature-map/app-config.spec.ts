import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig, toRepoRelative } from './app-config.js';

describe(getFeatureMapAppConfig.name, () => {
  test('keeps the extension on react-router with page objects and mocks', () => {
    const config = getFeatureMapAppConfig('extension');
    expect(config.routeUrlsObjectName).toBe('RouteUrls');
    expect(config.featureFlagsInterfaceName).toBe('FeatureFlags');
    expect(config.expoRouter).toBeUndefined();
    expect(config.maestro).toBeUndefined();
    expect(toRepoRelative(config.outputFile)).toBe('.claude/skills/feature-map/extension.md');
  });

  test('configures mobile for expo-router, Maestro and the browser rpc dispatch', () => {
    const config = getFeatureMapAppConfig('mobile');
    expect(config.routeUrlsObjectName).toBe('AppRoutes');
    expect(toRepoRelative(config.routeUrlsFile)).toBe('apps/mobile/src/shared/app-routes.ts');
    expect(config.expoRouter?.gateComponents).toEqual({ SplashScreenGuard: 'splashScreen' });
    expect(config.featureFlagHooks).toEqual(['useBoolVariation', 'useStringVariation']);
    expect(config.rpcDispatchFiles?.map(toRepoRelative)).toEqual([
      'apps/mobile/src/features/browser/browser/message-routing.ts',
      'apps/mobile/src/features/browser/approver-sheet/browser-approver.tsx',
    ]);
    expect(config.maestro?.flowsDirs.map(toRepoRelative)).toEqual([
      'apps/mobile/maestro/flows',
      'apps/mobile/maestro/shared',
    ]);
    expect(config.pageObjectsDir).toBeUndefined();
    expect(config.mocksDir).toBeUndefined();
    expect(toRepoRelative(config.outputFile)).toBe('.claude/skills/feature-map/mobile.md');
  });

  test('rejects an unknown app and lists the supported ones', () => {
    expect(() => getFeatureMapAppConfig('web')).toThrow(
      "feature-map: unsupported app 'web'. Supported apps: extension, mobile"
    );
  });
});
