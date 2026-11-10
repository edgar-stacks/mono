import { existsSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { compareStrings } from '../utils/compare.js';
import { type ExpoRouterConfig } from './app-config.js';
import { type RouteReference, type RoutedRoute, type RouterModel } from './routers-parser.js';
import { listFiles, parseSourceFile } from './ts-ast.js';

const screenFilePattern = /\.tsx?$/;
const specFilePattern = /\.spec\.tsx?$/;
const groupSegmentPattern = /^\(.+\)$/;
const indexSegment = 'index';
const layoutFileNames = ['_layout.tsx', '_layout.ts'];

function isScreenFile(file: string): boolean {
  if (!screenFilePattern.test(file) || specFilePattern.test(file)) return false;
  const name = path.basename(file);
  return !name.startsWith('_') && !name.startsWith('+');
}

export function expoRoutePath(relativeFile: string): string {
  const segments = relativeFile
    .replace(screenFilePattern, '')
    .split(/[\\/]/)
    .filter(segment => !groupSegmentPattern.test(segment));
  if (segments[segments.length - 1] === indexSegment) segments.pop();
  return `/${segments.join('/')}`;
}

function listExpoScreenFiles(appDir: string): string[] {
  return listFiles(appDir, isScreenFile);
}

export function layoutFilesAbove(appDir: string, file: string): string[] {
  const relativeDir = path.relative(appDir, path.dirname(file));
  const segments = relativeDir === '' ? [] : relativeDir.split(path.sep);
  const layouts: string[] = [];
  for (let depth = 0; depth <= segments.length; depth++) {
    const dir = path.join(appDir, ...segments.slice(0, depth));
    const layout = layoutFileNames
      .map(name => path.join(dir, name))
      .find(candidate => existsSync(candidate));
    if (layout) layouts.push(layout);
  }
  return layouts;
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

function gatesOfLayout(layout: string, gateComponents: Readonly<Record<string, string>>) {
  const gates: string[] = [];
  for (const tag of collectJsxTagNames(parseSourceFile(layout))) {
    const gate = gateComponents[tag];
    if (gate !== undefined && !gates.includes(gate)) gates.push(gate);
  }
  return gates;
}

export function parseExpoRoutes(
  config: ExpoRouterConfig,
  routeUrls: ReadonlyMap<string, string>
): RouterModel {
  const layoutGates = new Map<string, string[]>();
  function gatesFor(layout: string): string[] {
    const cached = layoutGates.get(layout);
    if (cached) return cached;
    const gates = gatesOfLayout(layout, config.gateComponents);
    layoutGates.set(layout, gates);
    return gates;
  }

  const routes: RoutedRoute[] = [];
  const references = new Map<string, RouteReference[]>();
  for (const file of listExpoScreenFiles(config.appDir)) {
    const routePath = expoRoutePath(path.relative(config.appDir, file));
    const keys = [...routeUrls]
      .filter(([, value]) => value === routePath)
      .map(([key]) => key)
      .sort(compareStrings);
    const gates = layoutFilesAbove(config.appDir, file).flatMap(gatesFor);
    routes.push({
      file,
      line: 1,
      keys,
      path: routePath,
      mountedPath: routePath,
      gates,
      flags: [],
      parentKeys: [],
      isIndex: false,
    });
    for (const key of keys) {
      references.set(key, [...(references.get(key) ?? []), { key, file, line: 1 }]);
    }
  }
  return { routes, references, unresolved: [] };
}
