import { existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { type ExpoRouterConfig } from './app-config.js';
import { type RouteReference, type RoutedRoute, type RouterModel } from './routers-parser.js';
import { listFiles, parseSourceFile } from './ts-ast.js';

const screenFilePattern = /\.tsx?$/;
const specFilePattern = /\.spec\.tsx?$/;
const layoutBaseName = '_layout';
const specialFilePrefix = '+';
const indexSegment = 'index';
const groupSegmentPattern = /^\(.+\)$/;
const layoutExtensions = ['.tsx', '.ts'] as const;
const screenLine = 1;

function toPosix(relative: string): string {
  return relative.split(path.sep).join('/');
}

export function isExpoScreenFile(relative: string): boolean {
  if (!screenFilePattern.test(relative) || specFilePattern.test(relative)) return false;
  const baseName = path.posix.basename(toPosix(relative)).replace(screenFilePattern, '');
  return baseName !== layoutBaseName && !baseName.startsWith(specialFilePrefix);
}

export function expoRoutePath(relative: string): string {
  const segments = toPosix(relative)
    .replace(screenFilePattern, '')
    .split('/')
    .filter(segment => segment !== indexSegment && !groupSegmentPattern.test(segment));
  return `/${segments.join('/')}`;
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

function layoutFileIn(dir: string): string | undefined {
  return layoutExtensions
    .map(extension => path.join(dir, `${layoutBaseName}${extension}`))
    .find(file => existsSync(file));
}

function layoutFilesAbove(appDir: string, screenFile: string): string[] {
  const relativeDir = path.relative(appDir, path.dirname(screenFile));
  const segments = relativeDir === '' ? [] : relativeDir.split(path.sep);
  const dirs = [
    appDir,
    ...segments.map((_, index) => path.join(appDir, ...segments.slice(0, index + 1))),
  ];
  return dirs.flatMap(dir => layoutFileIn(dir) ?? []);
}

export function layoutGates(
  layoutFiles: readonly string[],
  gateComponents: Readonly<Record<string, string>>,
  read: (file: string) => ts.SourceFile = file => parseSourceFile(file)
): string[] {
  const gates: string[] = [];
  for (const file of layoutFiles) {
    for (const tag of collectJsxTagNames(read(file))) {
      const gate = gateComponents[tag];
      if (gate !== undefined && !gates.includes(gate)) gates.push(gate);
    }
  }
  return gates;
}

function keysWithValue(routeUrls: ReadonlyMap<string, string>, value: string): string[] {
  return [...routeUrls.entries()]
    .filter(([, candidate]) => candidate === value)
    .map(([key]) => key);
}

export function parseExpoRoutes(
  config: ExpoRouterConfig,
  routeUrls: ReadonlyMap<string, string>
): RouterModel {
  const cache = new Map<string, ts.SourceFile>();
  function read(file: string): ts.SourceFile {
    const cached = cache.get(file);
    if (cached) return cached;
    const sourceFile = parseSourceFile(file);
    cache.set(file, sourceFile);
    return sourceFile;
  }

  const screenFiles = listFiles(config.appDir, file =>
    isExpoScreenFile(path.relative(config.appDir, file))
  );
  const routes: RoutedRoute[] = screenFiles.map(file => {
    const routePath = expoRoutePath(path.relative(config.appDir, file));
    return {
      file,
      line: screenLine,
      keys: keysWithValue(routeUrls, routePath),
      path: routePath,
      mountedPath: routePath,
      gates: layoutGates(layoutFilesAbove(config.appDir, file), config.gateComponents, read),
      flags: [],
      parentKeys: [],
      isIndex: false,
    };
  });

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
