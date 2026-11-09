import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig, getFeatureVocabulary, toRepoRelative } from './app-config.js';
import {
  featureGates,
  featureSessions,
  webFeatureGates,
  webFeatureSessions,
} from './feature-entry.js';
import { buildFeatureMapModel } from './model.js';

describe(getFeatureMapAppConfig.name, () => {
  test('supports the extension and web apps', () => {
    expect(getFeatureMapAppConfig('extension').app).toBe('extension');
    expect(getFeatureMapAppConfig('web').app).toBe('web');
    expect(() => getFeatureMapAppConfig('mobile')).toThrow(
      "unsupported app 'mobile'. Supported apps: extension, web"
    );
  });

  test('writes the web map next to the extension map', () => {
    expect(toRepoRelative(getFeatureMapAppConfig('web').outputFile)).toBe(
      '.claude/skills/feature-map/web.md'
    );
  });
});

describe(getFeatureVocabulary.name, () => {
  test('defaults to the extension gates and sessions', () => {
    expect(getFeatureVocabulary(getFeatureMapAppConfig('extension'))).toEqual({
      gates: featureGates,
      sessions: featureSessions,
    });
  });

  test('takes the web gates and sessions from the web config', () => {
    expect(getFeatureVocabulary(getFeatureMapAppConfig('web'))).toEqual({
      gates: webFeatureGates,
      sessions: webFeatureSessions,
    });
  });
});

describe('web route config', () => {
  const model = buildFeatureMapModel(getFeatureMapAppConfig('web'));

  test('parses without errors', () => {
    expect(model.parseErrors).toEqual([]);
  });

  test('resolves every route of the web app to a RouteUrls key', () => {
    expect(model.router.routes.length).toBeGreaterThan(0);
    const unkeyed = model.router.routes
      .filter(route => route.keys.length !== 1)
      .map(route => route.mountedPath);
    expect(unkeyed).toEqual([]);
  });

  test('mounts every RouteUrls key exactly once', () => {
    const mounted = model.router.routes.flatMap(route => route.keys).sort();
    expect(mounted).toEqual([...model.routeUrls.keys()].sort());
  });
});
