import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig, toRepoRelative } from './app-config.js';

describe(getFeatureMapAppConfig.name, () => {
  test('keeps the extension config on page objects, mocks and rpc handler files', () => {
    const config = getFeatureMapAppConfig('extension');
    expect(config.featureFlagsInterfaceName).toBe('FeatureFlags');
    expect(config.setupMocksFunctionName).toBe('setupMockApis');
    expect(config.expoRouter).toBeUndefined();
    expect(config.maestro).toBeUndefined();
    expect(toRepoRelative(config.outputFile)).toBe('.claude/skills/feature-map/extension.md');
  });

  test('configures mobile with expo-router screens, Maestro flows and flag hooks', () => {
    const config = getFeatureMapAppConfig('mobile');
    expect(config.routeUrlsObjectName).toBe('AppRoutes');
    expect(toRepoRelative(config.routeUrlsFile)).toBe('apps/mobile/src/shared/app-routes.ts');
    expect(toRepoRelative(config.selectorsDir)).toBe('apps/mobile/src/shared/selectors');
    expect(config.expoRouter?.gateComponents).toEqual({ SplashScreenGuard: 'splashScreen' });
    expect(config.maestro?.flowsDirs.map(toRepoRelative)).toEqual([
      'apps/mobile/maestro/flows',
      'apps/mobile/maestro/shared',
    ]);
    expect(config.featureFlagHooks).toEqual(['useBoolVariation', 'useStringVariation']);
    expect(config.rpcDispatchFiles?.map(toRepoRelative)).toEqual([
      'apps/mobile/src/features/browser/browser/message-routing.ts',
      'apps/mobile/src/features/browser/approver-sheet/browser-approver.tsx',
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
