import path from 'node:path';
import ts from 'typescript';

import { type RpcHandler, loadRpcEndpointNames } from './test-assets.js';
import { getLine, parseSourceFile } from './ts-ast.js';

const rpcDispatchProperties: ReadonlySet<string> = new Set(['method', 'request']);

export function collectDispatchedMethods(
  sourceFile: ts.SourceFile,
  endpoints: ReadonlyMap<string, string>
): Map<string, number> {
  const methods = new Map<string, number>();
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      rpcDispatchProperties.has(node.name.text)
    ) {
      const method = endpoints.get(node.expression.text);
      if (method !== undefined && !methods.has(method)) {
        methods.set(method, getLine(sourceFile, node));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return methods;
}

export function loadRpcDispatchHandlers(
  dispatchFiles: readonly string[],
  rpcEndpointsDir: string
): Map<string, RpcHandler> {
  const endpoints = loadRpcEndpointNames(rpcEndpointsDir);
  const handlers = new Map<string, RpcHandler>();
  for (const file of dispatchFiles) {
    for (const [method, line] of collectDispatchedMethods(parseSourceFile(file), endpoints)) {
      if (handlers.has(method)) continue;
      handlers.set(method, { name: method, file, line, methods: [method] });
    }
  }
  return handlers;
}

export function dispatchFilesLabel(dispatchFiles: readonly string[]): string {
  return dispatchFiles.map(file => path.basename(file)).join(', ');
}
