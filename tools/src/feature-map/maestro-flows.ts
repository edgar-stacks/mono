import path from 'node:path';

import { type MaestroConfig, toRepoRelative } from './app-config.js';
import { type SpecFile } from './test-assets.js';
import { type SourceLocation, listFiles } from './ts-ast.js';

const flowFilePattern = /\.ya?ml$/;

function listFlows(dir: string): string[] {
  return listFiles(dir, file => flowFilePattern.test(file));
}

export function loadMaestroFlows(config: MaestroConfig): Map<string, SpecFile> {
  const flows = new Map<string, SpecFile>();
  for (const file of config.flowsDirs.flatMap(listFlows)) {
    const relative = toRepoRelative(file);
    flows.set(relative, { path: relative, routeKeys: [] });
  }
  return flows;
}

export function maestroActionName(actionsDir: string, file: string): string {
  return path.relative(actionsDir, file).replace(flowFilePattern, '').split(path.sep).join('/');
}

export function loadMaestroActions(config: MaestroConfig): Map<string, SourceLocation> {
  const actions = new Map<string, SourceLocation>();
  for (const file of listFlows(config.actionsDir)) {
    actions.set(maestroActionName(config.actionsDir, file), { file, line: 1 });
  }
  return actions;
}
