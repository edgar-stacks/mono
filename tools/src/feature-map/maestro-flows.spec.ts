import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import { loadMaestroActions, loadMaestroFlows } from './maestro-flows.js';

const tempDir = mkdtempSync(path.join(tmpdir(), 'feature-map-maestro-'));

function writeFlow(file: string) {
  const target = path.join(tempDir, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, 'appId: io.leather.mobilewallet\n---\n- launchApp\n');
}

describe(loadMaestroFlows.name, () => {
  test('lists the yaml flows of every flows dir and nothing else', () => {
    writeFlow('flows/smoke.yaml');
    writeFlow('shared/unlock.yml');
    writeFlow('legacy-flows/old.yaml');
    writeFileSync(path.join(tempDir, 'flows/readme.md'), '');
    const flows = loadMaestroFlows({
      flowsDirs: [path.join(tempDir, 'flows'), path.join(tempDir, 'shared')],
      actionsDir: path.join(tempDir, 'shared'),
    });
    const names = [...flows.keys()].map(flow => path.basename(flow));
    expect(names).toEqual(['smoke.yaml', 'unlock.yml']);
    expect([...flows.values()].every(flow => flow.routeKeys.length === 0)).toBe(true);
  });

  test('keys the mobile flows by repo-relative path and leaves out legacy flows', () => {
    const maestro = getFeatureMapAppConfig('mobile').maestro;
    if (!maestro) throw new Error('mobile has no maestro config');
    const flows = [...loadMaestroFlows(maestro).keys()];
    expect(flows).toContain('apps/mobile/maestro/flows/smoke-tests.yaml');
    expect(flows).toContain('apps/mobile/maestro/shared/unlock.yaml');
    expect(flows.some(flow => flow.includes('legacy-flows'))).toBe(false);
  });
});

describe(loadMaestroActions.name, () => {
  test('names the shared sub-flows by repo-relative path', () => {
    const maestro = getFeatureMapAppConfig('mobile').maestro;
    if (!maestro) throw new Error('mobile has no maestro config');
    const actions = loadMaestroActions(maestro);
    expect(actions.get('apps/mobile/maestro/shared/unlock.yaml')?.line).toBe(1);
    expect(actions.has('apps/mobile/maestro/flows/smoke-tests.yaml')).toBe(false);
  });
});
