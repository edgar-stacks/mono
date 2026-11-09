import { existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { type ExpoRouterConfig } from './app-config.js';
import { type RouteReference, type RoutedRoute, type RouterModel } from './routers-parser.js';
import { listFiles, parseSourceFile } from './ts-ast.js';

interface ExpoScreen {
  readonly file: string;
  readonly path: string;
}

const screenFilePattern = /\.tsx?$/;
const specFilePattern = /\.spec\.tsx?$/;
const groupSegmentPattern = /^\(.+\)$/;
const indexSegment = 'index';
const layoutFileNames = ['_layout.tsx', '_layout.ts'];

function isReservedFileName(name: string): boolean {
  return name.startsWith('_') || name.startsWith('+');
}

export function isExpoScreenFile(relativeFile: string): boolean {
  const name = path.posix.basename(relativeFile);
  return screenFilePattern.test(name) && !specFilePattern.test(name) && !isReservedFileName(name);
}

export function expoScreenPath(relativeFile: string): string {
  const segments = relativeFile
    .replace(screenFilePattern, '')
    .split('/')
    .filter(segment => segment !== indexSegment && !groupSegmentPattern.test(segment));
  return `/${segments.join('/')}`;
}

function toPosix(file: string): string {
  return file.split(path.sep).join('/');
}

export function loadExpoScreens(appDir: string): ExpoScreen[] {
  return listFiles(appDir, file => isExpoScreenFile(toPosix(path.relative(appDir, file)))).map(
    file => ({ file, path: expoScreenPath(toPosix(path.relative(appDir, file))) })
  );
}

function collectJsxTagNames(sourceFile: ts.SourceFile): string[] {
  const tags: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      tags.push(node.tagName.getText(sourceFile));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return tags;
}

export function layoutFilesAbove(appDir: string, screenFile: string): string[] {
  const relativeDir = toPosix(path.relative(appDir, path.dirname(screenFile)));
  const dirs = relativeDir === '' ? [] : relativeDir.split('/');
  return Array.from({ length: dirs.length + 1 }, (_, depth) =>
    path.join(appDir, ...dirs.slice(0, depth))
  )
    .map(dir => layoutFileNames.map(name => path.join(dir, name)).find(file => existsSync(file)))
    .filter(file => file !== undefined);
}

export function layoutGates(
  layoutSources: readonly ts.SourceFile[],
  gateComponents: Readonly<Record<string, string>>
): string[] {
  const gates: string[] = [];
  for (const sourceFile of layoutSources) {
    for (const tag of collectJsxTagNames(sourceFile)) {
      const gate = gateComponents[tag];
      if (gate !== undefined && !gates.includes(gate)) gates.push(gate);
    }
  }
  return gates;
}

export function buildExpoRouterModel(
  screens: readonly ExpoScreen[],
  routeUrls: ReadonlyMap<string, string>,
  gatesForScreen: (screen: ExpoScreen) => readonly string[]
): RouterModel {
  const references = new Map<string, RouteReference[]>();
  const routes: RoutedRoute[] = screens.map(screen => {
    const keys = [...routeUrls].filter(([, value]) => value === screen.path).map(([key]) => key);
    for (const key of keys) {
      references.set(key, [...(references.get(key) ?? []), { key, file: screen.file, line: 1 }]);
    }
    return {
      file: screen.file,
      line: 1,
      keys,
      path: screen.path,
      mountedPath: screen.path,
      gates: gatesForScreen(screen),
      flags: [],
      parentKeys: [],
      isIndex: false,
    };
  });
  return { routes, references, unresolved: [] };
}

export function parseExpoRoutes(
  config: ExpoRouterConfig,
  routeUrls: ReadonlyMap<string, string>
): RouterModel {
  const layouts = new Map<string, ts.SourceFile>();
  function layoutSource(file: string): ts.SourceFile {
    const cached = layouts.get(file);
    if (cached) return cached;
    const sourceFile = parseSourceFile(file);
    layouts.set(file, sourceFile);
    return sourceFile;
  }
  return buildExpoRouterModel(loadExpoScreens(config.appDir), routeUrls, screen =>
    layoutGates(
      layoutFilesAbove(config.appDir, screen.file).map(layoutSource),
      config.gateComponents
    )
  );
}
