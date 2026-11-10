import { type FeatureMapAppConfig, toRepoRelative } from './app-config.js';
import { type SpecFile } from './test-assets.js';
import { type SourceLocation, listFiles } from './ts-ast.js';

const maestroFlowPattern = /\.ya?ml$/;

function listFlows(dir: string): string[] {
  return listFiles(dir, file => maestroFlowPattern.test(file));
}

export function loadMaestroFlows(config: FeatureMapAppConfig): Map<string, SpecFile> {
  const flows = new Map<string, SpecFile>();
  for (const dir of config.maestro?.flowsDirs ?? []) {
    for (const file of listFlows(dir)) {
      const relative = toRepoRelative(file);
      flows.set(relative, { path: relative, routeKeys: [] });
    }
  }
  return flows;
}

export function loadMaestroActions(config: FeatureMapAppConfig): Map<string, SourceLocation> {
  const actions = new Map<string, SourceLocation>();
  if (!config.maestro) return actions;
  for (const file of listFlows(config.maestro.actionsDir)) {
    actions.set(toRepoRelative(file), { file, line: 1 });
  }
  return actions;
}
