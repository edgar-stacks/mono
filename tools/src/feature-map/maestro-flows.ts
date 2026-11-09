import { type MaestroConfig, toRepoRelative } from './app-config.js';
import { type SpecFile } from './test-assets.js';
import { type SourceLocation, listFiles } from './ts-ast.js';

const flowFilePattern = /\.ya?ml$/;

function listFlowFiles(dir: string): string[] {
  return listFiles(dir, file => flowFilePattern.test(file));
}

export function loadMaestroFlows(config: MaestroConfig): Map<string, SpecFile> {
  const flows = new Map<string, SpecFile>();
  for (const file of config.flowsDirs.flatMap(listFlowFiles)) {
    const relative = toRepoRelative(file);
    flows.set(relative, { path: relative, routeKeys: [] });
  }
  return flows;
}

export function loadMaestroActions(config: MaestroConfig): Map<string, SourceLocation> {
  return new Map(
    listFlowFiles(config.actionsDir).map(file => [toRepoRelative(file), { file, line: 1 }])
  );
}
