import path from 'node:path';

import { type MaestroConfig, toRepoRelative } from './app-config.js';
import { type PageObjectAction, type SpecFile } from './test-assets.js';
import { listFiles } from './ts-ast.js';

const flowFilePattern = /\.ya?ml$/;
const flowLine = 1;

export function isMaestroFlowFile(file: string): boolean {
  return flowFilePattern.test(file);
}

export function loadMaestroFlows(config: MaestroConfig): Map<string, SpecFile> {
  const flows = new Map<string, SpecFile>();
  for (const dir of config.flowsDirs) {
    for (const file of listFiles(dir, isMaestroFlowFile)) {
      const relative = toRepoRelative(file);
      flows.set(relative, { path: relative, routeKeys: [] });
    }
  }
  return flows;
}

export function loadMaestroActions(config: MaestroConfig): Map<string, PageObjectAction> {
  const actions = new Map<string, PageObjectAction>();
  for (const file of listFiles(config.actionsDir, isMaestroFlowFile)) {
    actions.set(toRepoRelative(file), {
      file,
      line: flowLine,
      className: path.basename(path.dirname(file)),
      requiredParameters: 0,
      isStatic: false,
    });
  }
  return actions;
}
