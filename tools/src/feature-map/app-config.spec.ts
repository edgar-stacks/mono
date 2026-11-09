import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getMonorepoRoot } from '../utils/paths.js';
import { featureVocabulary, getFeatureMapAppConfig } from './app-config.js';
import {
  featureGates,
  featureSessions,
  webFeatureFlags,
  webFeatureGates,
  webFeatureSessions,
} from './feature-entry.js';

const root = getMonorepoRoot();

describe(getFeatureMapAppConfig.name, () => {
  test('keeps the extension on its own router scan and vocabulary', () => {
    const config = getFeatureMapAppConfig('extension');
    expect(config.routeConfigFile).toBeUndefined();
    expect(config.rpcMethodsDir).toBe(
      path.join(root, 'apps/extension/src/background/messaging/rpc-methods')
    );
    expect(config.outputFile).toBe(path.join(root, '.claude/skills/feature-map/extension.md'));
    expect(featureVocabulary(config)).toEqual({ gates: featureGates, sessions: featureSessions });
  });

  test('reads the web app from its route config', () => {
    const config = getFeatureMapAppConfig('web');
    expect(config.routeConfigFile).toBe(path.join(root, 'apps/web/app/routes.ts'));
    expect(config.routeUrlsFile).toBe(path.join(root, 'apps/web/app/route-urls.ts'));
    expect(config.featuresDir).toBe(path.join(root, 'apps/web/tests/feature-map'));
    expect(config.outputFile).toBe(path.join(root, '.claude/skills/feature-map/web.md'));
    expect(config.layoutGates).toEqual({
      'pages/multisig/multisig.layout.tsx': 'multisigLayout',
      'pages/playground/playground.layout.tsx': 'playgroundLayout',
    });
    expect(config.conditionFlags).toEqual({
      "import.meta.env.MODE !== 'production'": 'nonProductionBuild',
    });
    expect(config.flags).toEqual(webFeatureFlags);
    expect(config.readySelectorRequired).toBe(false);
    expect(config.routeKeysRequired).toBe(true);
  });

  test('has no rpc, page-object or feature-flag sources for web', () => {
    const config = getFeatureMapAppConfig('web');
    expect(config.rpcMethodsDir).toBeUndefined();
    expect(config.rpcEndpointsDir).toBeUndefined();
    expect(config.pageObjectsDir).toBeUndefined();
    expect(config.featureFlagsFile).toBeUndefined();
    expect(config.setupMocksFunctionName).toBeUndefined();
  });

  test('takes the web gates and sessions from the config', () => {
    expect(featureVocabulary(getFeatureMapAppConfig('web'))).toEqual({
      gates: webFeatureGates,
      sessions: webFeatureSessions,
    });
  });

  test('rejects an unsupported app', () => {
    expect(() => getFeatureMapAppConfig('mobile')).toThrow(
      "feature-map: unsupported app 'mobile'. Supported apps: extension, web"
    );
  });
});
