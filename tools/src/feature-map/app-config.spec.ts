import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getMonorepoRoot } from '../utils/paths.js';
import { getFeatureMapAppConfig } from './app-config.js';

const root = getMonorepoRoot();

describe(getFeatureMapAppConfig.name, () => {
  test('keeps the extension on its routers, page objects and mocks', () => {
    const config = getFeatureMapAppConfig('extension');
    expect(config.routeUrlsObjectName).toBe('RouteUrls');
    expect(config.featureFlagsInterfaceName).toBe('FeatureFlags');
    expect(config.pageObjectsDir).toBe(path.join(root, 'apps/extension/tests/page-object-models'));
    expect(config.setupMocksFunctionName).toBe('setupMockApis');
    expect(config.expoRouter).toBeUndefined();
    expect(config.maestro).toBeUndefined();
    expect(config.outputFile).toBe(path.join(root, '.claude/skills/feature-map/extension.md'));
  });

  test('points the mobile app at expo-router screens, Maestro flows and flag hooks', () => {
    const config = getFeatureMapAppConfig('mobile');
    const appDir = path.join(root, 'apps/mobile');
    expect(config.app).toBe('mobile');
    expect(config.routeUrlsFile).toBe(path.join(appDir, 'src/shared/app-routes.ts'));
    expect(config.routeUrlsObjectName).toBe('AppRoutes');
    expect(config.featureFlagHooks).toEqual(['useBoolVariation', 'useStringVariation']);
    expect(config.featureFlagsInterfaceName).toBeUndefined();
    expect(config.rpcMethodsDir).toBeUndefined();
    expect(config.rpcDispatchFiles).toEqual([
      path.join(appDir, 'src/features/browser/browser/message-routing.ts'),
      path.join(appDir, 'src/features/browser/approver-sheet/browser-approver.tsx'),
    ]);
    expect(config.pageObjectsDir).toBeUndefined();
    expect(config.mocksDir).toBeUndefined();
    expect(config.setupMocksFunctionName).toBeUndefined();
    expect(config.selectorsDir).toBe(path.join(appDir, 'src/shared/selectors'));
    expect(config.expoRouter).toEqual({
      appDir: path.join(appDir, 'src/app'),
      gateComponents: { SplashScreenGuard: 'splashScreen' },
    });
    expect(config.maestro).toEqual({
      flowsDirs: [path.join(appDir, 'maestro/flows'), path.join(appDir, 'maestro/shared')],
      actionsDir: path.join(appDir, 'maestro/shared'),
    });
    expect(config.outputFile).toBe(path.join(root, '.claude/skills/feature-map/mobile.md'));
  });

  test('rejects an unknown app and lists the supported ones', () => {
    expect(() => getFeatureMapAppConfig('web')).toThrow(
      "feature-map: unsupported app 'web'. Supported apps: extension, mobile"
    );
  });
});
