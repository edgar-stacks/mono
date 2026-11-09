import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig, toRepoRelative } from './app-config.js';
import { isMaestroFlowFile, loadMaestroActions, loadMaestroFlows } from './maestro-flows.js';

const config = getFeatureMapAppConfig('mobile');

describe(isMaestroFlowFile.name, () => {
  test('accepts yaml flows only', () => {
    expect(isMaestroFlowFile('smoke-tests.yaml')).toBe(true);
    expect(isMaestroFlowFile('unlock.yml')).toBe(true);
    expect(isMaestroFlowFile('README.md')).toBe(false);
  });
});

describe(loadMaestroFlows.name, () => {
  test('keys the flows of the configured dirs by repo-relative path, without legacy flows', () => {
    if (!config.maestro) throw new Error('mobile config has no maestro dirs');
    const flows = loadMaestroFlows(config.maestro);
    expect(flows.has('apps/mobile/maestro/flows/smoke-tests.yaml')).toBe(true);
    expect(flows.has('apps/mobile/maestro/shared/unlock.yaml')).toBe(true);
    expect([...flows.keys()].some(flow => flow.includes('legacy-flows'))).toBe(false);
  });
});

describe(loadMaestroActions.name, () => {
  test('lists the shared sub-flows as actions', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'maestro-'));
    const actionsDir = path.join(root, 'shared');
    mkdirSync(actionsDir);
    writeFileSync(path.join(actionsDir, 'unlock.yaml'), 'appId: x\n---\n- tapOn: Unlock\n');
    writeFileSync(path.join(actionsDir, 'notes.md'), '');

    const actions = loadMaestroActions({ flowsDirs: [], actionsDir });
    const unlock = path.join(actionsDir, 'unlock.yaml');
    expect([...actions.keys()]).toEqual([toRepoRelative(unlock)]);
    expect(actions.get(toRepoRelative(unlock))).toMatchObject({ file: unlock, line: 1 });
  });
});
