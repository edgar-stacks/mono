import path from 'node:path';
import ts from 'typescript';

import { type ExpoRouterConfig } from './app-config.js';
import { type RouteReference, type RoutedRoute, type RouterModel } from './routers-parser.js';
import { listFiles, parseSourceFile } from './ts-ast.js';

interface ExpoScreen {
  readonly file: string;
  readonly path: string;
  readonly gates: readonly string[];
}

const screenFilePattern = /\.tsx?$/;
const specFilePattern = /\.spec\.tsx?$/;
const layoutFileName = '_layout';
const indexSegment = 'index';
const groupSegmentPattern = /^\(.+\)$/;
const layoutExtensions = ['.tsx', '.ts'];

function isScreenFile(relative: string): boolean {
  if (!screenFilePattern.test(relative) || specFilePattern.test(relative)) return false;
  const name = path.posix.basename(relative).replace(screenFilePattern, '');
  return !name.startsWith('_') && !name.startsWith('+');
}

export function expoRoutePath(relative: string): string | undefined {
  const normalized = relative.split(path.sep).join('/');
  if (!isScreenFile(normalized)) return undefined;
  const segments = normalized
    .replace(screenFilePattern, '')
    .split('/')
    .filter(segment => segment !== indexSegment && !groupSegmentPattern.test(segment));
  return `/${segments.join('/')}`;
}

export function collectGateComponents(
  sourceFile: ts.SourceFile,
  gateComponents: Readonly<Record<string, string>>
): string[] {
  const gates: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const gate = gateComponents[node.tagName.getText(sourceFile)];
      if (gate !== undefined && !gates.includes(gate)) gates.push(gate);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return gates;
}

function layoutFilesAbove(appDir: string, file: string, layouts: ReadonlySet<string>): string[] {
  const relativeDir = path.relative(appDir, path.dirname(file));
  const segments = relativeDir === '' ? [] : relativeDir.split(path.sep);
  const dirs = [
    appDir,
    ...segments.map((_, index) => path.join(appDir, ...segments.slice(0, index + 1))),
  ];
  return dirs.flatMap(dir =>
    layoutExtensions
      .map(extension => path.join(dir, `${layoutFileName}${extension}`))
      .filter(candidate => layouts.has(candidate))
  );
}

export function loadExpoScreens(config: ExpoRouterConfig): ExpoScreen[] {
  const files = listFiles(config.appDir, file => screenFilePattern.test(file));
  const layouts = new Set(
    files.filter(file => path.basename(file).replace(screenFilePattern, '') === layoutFileName)
  );
  const gatesByLayout = new Map(
    [...layouts].map(layout => [
      layout,
      collectGateComponents(parseSourceFile(layout), config.gateComponents),
    ])
  );
  const screens: ExpoScreen[] = [];
  for (const file of files) {
    const routePath = expoRoutePath(path.relative(config.appDir, file));
    if (routePath === undefined) continue;
    const gates = layoutFilesAbove(config.appDir, file, layouts).flatMap(
      layout => gatesByLayout.get(layout) ?? []
    );
    screens.push({ file, path: routePath, gates });
  }
  return screens;
}

export function buildExpoRouterModel(
  screens: readonly ExpoScreen[],
  routeUrls: ReadonlyMap<string, string>
): RouterModel {
  const routes: RoutedRoute[] = screens.map(screen => ({
    file: screen.file,
    line: 1,
    keys: [...routeUrls].filter(([, value]) => value === screen.path).map(([key]) => key),
    path: screen.path,
    mountedPath: screen.path,
    gates: screen.gates,
    flags: [],
    parentKeys: [],
    isIndex: false,
  }));
  const references = new Map<string, RouteReference[]>();
  for (const route of routes) {
    for (const key of route.keys) {
      const list = references.get(key) ?? [];
      list.push({ key, file: route.file, line: route.line });
      references.set(key, list);
    }
  }
  return { routes, references, unresolved: [] };
}
