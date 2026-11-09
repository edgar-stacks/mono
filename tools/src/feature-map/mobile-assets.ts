import ts from 'typescript';

import { type FeatureMapAppConfig } from './app-config.js';
import { type RpcHandler, loadRpcEndpointNames } from './test-assets.js';
import { getLine, parseSourceFile } from './ts-ast.js';

const rpcDispatchProperties = new Set(['method', 'request']);

function firstStringArgument(node: ts.CallExpression): string | undefined {
  const argument = node.arguments[0];
  if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
    return argument.text;
  }
  return undefined;
}

export function collectHookFlags(sourceFile: ts.SourceFile, hooks: readonly string[]): string[] {
  const flags: string[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      hooks.includes(node.expression.text)
    ) {
      const flag = firstStringArgument(node);
      if (flag !== undefined && !flags.includes(flag)) flags.push(flag);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return flags;
}

export function loadFeatureFlagHooks(config: FeatureMapAppConfig): string[] {
  return collectHookFlags(parseSourceFile(config.featureFlagsFile), config.featureFlagHooks ?? []);
}

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

export function loadRpcDispatchHandlers(config: FeatureMapAppConfig): Map<string, RpcHandler> {
  const endpoints = loadRpcEndpointNames(config);
  const handlers = new Map<string, RpcHandler>();
  for (const file of config.rpcDispatchFiles ?? []) {
    for (const [method, line] of collectDispatchedMethods(parseSourceFile(file), endpoints)) {
      if (handlers.has(method)) continue;
      handlers.set(method, { name: method, file, line, methods: [method] });
    }
  }
  return handlers;
}
