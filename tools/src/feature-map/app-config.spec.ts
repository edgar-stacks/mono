import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getMonorepoRoot } from '../utils/paths.js';
import { getFeatureMapAppConfig, toRepoRelative } from './app-config.js';

describe(getFeatureMapAppConfig.name, () => {
  test('keeps the extension on its react-router, page-object and mock config', () => {
    const config = getFeatureMapAppConfig('extension');
    expect(config.routeUrlsObjectName).toBe('RouteUrls');
    expect(config.featureFlagsInterfaceName).toBe('FeatureFlags');
    expect(config.pageObjectsDir).toBeDefined();
    expect(config.mocksDir).toBeDefined();
    expect(config.expoRouter).toBeUndefined();
    expect(config.maestro).toBeUndefined();
    expect(toRepoRelative(config.outputFile)).toBe('.claude/skills/feature-map/extension.md');
  });

  test('configures mobile with expo-router screens, Maestro flows, flag hooks and rpc dispatch files', () => {
    const config = getFeatureMapAppConfig('mobile');
    expect(config.app).toBe('mobile');
    expect(config.routeUrlsObjectName).toBe('AppRoutes');
    expect(toRepoRelative(config.routeUrlsFile)).toBe('apps/mobile/src/shared/app-routes.ts');
    expect(toRepoRelative(config.selectorsDir)).toBe('apps/mobile/src/shared/selectors');
    expect(toRepoRelative(config.featuresDir)).toBe('apps/mobile/tests/feature-map');
    expect(config.featureFlagsInterfaceName).toBeUndefined();
    expect(config.featureFlagHooks).toEqual(['useBoolVariation', 'useStringVariation']);
    expect(config.rpcMethodsDir).toBeUndefined();
    expect(config.rpcDispatchFiles?.map(toRepoRelative)).toEqual([
      'apps/mobile/src/features/browser/browser/message-routing.ts',
      'apps/mobile/src/features/browser/approver-sheet/browser-approver.tsx',
    ]);
    expect(config.pageObjectsDir).toBeUndefined();
    expect(config.mocksDir).toBeUndefined();
    expect(config.setupMocksFunctionName).toBeUndefined();
    expect(config.expoRouter?.appDir).toBe(path.join(getMonorepoRoot(), 'apps/mobile/src/app'));
    expect(config.expoRouter?.gateComponents).toEqual({ SplashScreenGuard: 'splashScreen' });
    expect(config.maestro?.flowsDirs.map(toRepoRelative)).toEqual([
      'apps/mobile/maestro/flows',
      'apps/mobile/maestro/shared',
    ]);
    expect(config.maestro && toRepoRelative(config.maestro.actionsDir)).toBe(
      'apps/mobile/maestro/shared'
    );
    expect(toRepoRelative(config.outputFile)).toBe('.claude/skills/feature-map/mobile.md');
  });

  test('rejects an unknown app and lists the supported ones', () => {
    expect(() => getFeatureMapAppConfig('web')).toThrow(
      "feature-map: unsupported app 'web'. Supported apps: extension, mobile"
    );
  });
});
