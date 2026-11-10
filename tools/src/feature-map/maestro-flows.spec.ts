import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig, toRepoRelative } from './app-config.js';
import { loadMaestroActions, loadMaestroFlows } from './maestro-flows.js';

const config = getFeatureMapAppConfig('mobile');

describe(loadMaestroFlows.name, () => {
  test('lists the yaml flows of every flows dir by repo-relative path', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'feature-map-maestro-'));
    const flows = path.join(root, 'flows');
    const shared = path.join(root, 'shared');
    mkdirSync(flows, { recursive: true });
    mkdirSync(shared, { recursive: true });
    writeFileSync(path.join(flows, 'smoke.yaml'), 'appId: x\n---\n- launchApp\n');
    writeFileSync(path.join(flows, 'notes.md'), '# notes');
    writeFileSync(path.join(shared, 'unlock.yml'), 'appId: x\n---\n- tapOn: x\n');
    const loaded = loadMaestroFlows({
      ...config,
      maestro: { flowsDirs: [flows, shared], actionsDir: shared },
    });
    expect([...loaded.keys()]).toEqual([
      toRepoRelative(path.join(flows, 'smoke.yaml')),
      toRepoRelative(path.join(shared, 'unlock.yml')),
    ]);
  });

  test('accepts the mobile flows and shared sub-flows but not the legacy flows', () => {
    const specs = [...loadMaestroFlows(config).keys()];
    expect(specs).toContain('apps/mobile/maestro/flows/smoke-tests.yaml');
    expect(specs).toContain('apps/mobile/maestro/shared/unlock.yaml');
    expect(specs.some(spec => spec.includes('legacy-flows'))).toBe(false);
  });

  test('is empty for an app without Maestro config', () => {
    expect(loadMaestroFlows(getFeatureMapAppConfig('extension')).size).toBe(0);
  });
});

describe(loadMaestroActions.name, () => {
  test('names the shared sub-flows by repo-relative path', () => {
    const actions = loadMaestroActions(config);
    expect(actions.get('apps/mobile/maestro/shared/unlock.yaml')?.line).toBe(1);
    expect([...actions.keys()].every(name => name.startsWith('apps/mobile/maestro/shared/'))).toBe(
      true
    );
  });

  test('is empty for an app without Maestro config', () => {
    expect(loadMaestroActions(getFeatureMapAppConfig('extension')).size).toBe(0);
  });
});
