import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { type MaestroConfig, getFeatureMapAppConfig } from './app-config.js';
import { loadMaestroActions, loadMaestroFlows, maestroActionName } from './maestro-flows.js';

function mobileMaestro(): MaestroConfig {
  const { maestro } = getFeatureMapAppConfig('mobile');
  if (!maestro) throw new Error('the mobile feature-map config has no maestro section');
  return maestro;
}

const maestro = mobileMaestro();

describe(loadMaestroFlows.name, () => {
  test('lists flows and shared sub-flows by repo-relative path', () => {
    const flows = loadMaestroFlows(maestro);
    expect(flows.has('apps/mobile/maestro/flows/smoke-tests.yaml')).toBe(true);
    expect(flows.has('apps/mobile/maestro/shared/unlock.yaml')).toBe(true);
  });

  test('leaves out the legacy flows', () => {
    const flows = loadMaestroFlows(maestro);
    expect([...flows.keys()].some(flow => flow.includes('/legacy-flows/'))).toBe(false);
  });
});

describe(loadMaestroActions.name, () => {
  test('names each shared sub-flow by its path under the shared folder', () => {
    const actions = loadMaestroActions(maestro);
    expect([...actions.keys()]).toEqual(expect.arrayContaining(['clean-up', 'unlock']));
    expect(actions.get('unlock')?.file).toBe(path.join(maestro.actionsDir, 'unlock.yaml'));
  });
});

describe(maestroActionName.name, () => {
  test('drops the extension and keeps nested folders', () => {
    expect(maestroActionName('/maestro/shared', '/maestro/shared/unlock.yaml')).toBe('unlock');
    expect(maestroActionName('/maestro/shared', '/maestro/shared/wallet/add.yml')).toBe(
      'wallet/add'
    );
  });
});
