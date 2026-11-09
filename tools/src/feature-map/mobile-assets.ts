import ts from 'typescript';

import { type FeatureMapAppConfig } from './app-config.js';
import { type RpcHandler, loadRpcEndpointNames } from './test-assets.js';
import { getLine, parseSourceFile } from './ts-ast.js';

const endpointMemberNames = new Set(['method', 'request']);

function firstStringArgument(node: ts.CallExpression): string | undefined {
  const argument = node.arguments[0];
  if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)))
    return argument.text;
  return undefined;
}

export function collectHookFlags(
  sourceFile: ts.SourceFile,
  hookNames: readonly string[]
): string[] {
  const flags: string[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      hookNames.includes(node.expression.text)
    ) {
      const flag = firstStringArgument(node);
      if (flag !== undefined && !flags.includes(flag)) flags.push(flag);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return flags;
}

export function collectDispatchedEndpoints(
  sourceFile: ts.SourceFile,
  endpoints: ReadonlySet<string>
): Map<string, number> {
  const names = new Map<string, number>();
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      endpoints.has(node.expression.text) &&
      endpointMemberNames.has(node.name.text) &&
      !names.has(node.expression.text)
    ) {
      names.set(node.expression.text, getLine(sourceFile, node));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return names;
}

export function loadHookFeatureFlags(config: FeatureMapAppConfig): string[] {
  return collectHookFlags(parseSourceFile(config.featureFlagsFile), config.featureFlagHooks ?? []);
}

export function loadDispatchedRpcHandlers(config: FeatureMapAppConfig): Map<string, RpcHandler> {
  const endpoints = loadRpcEndpointNames(config);
  const handlers = new Map<string, RpcHandler>();
  for (const file of config.rpcDispatchFiles ?? []) {
    const dispatched = collectDispatchedEndpoints(parseSourceFile(file), new Set(endpoints.keys()));
    for (const [name, line] of dispatched) {
      const method = endpoints.get(name);
      if (method === undefined || handlers.has(method)) continue;
      handlers.set(method, { name: method, file, line, methods: [method] });
    }
  }
  return handlers;
}
