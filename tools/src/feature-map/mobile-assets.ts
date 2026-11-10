import ts from 'typescript';

import { type FeatureMapAppConfig } from './app-config.js';
import { type RpcHandler, loadRpcEndpointNames } from './test-assets.js';
import { getLine, parseSourceFile } from './ts-ast.js';

const endpointMemberNames = ['method', 'request'];

function getStringArgument(node: ts.CallExpression): string | undefined {
  const argument = node.arguments[0];
  if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
    return argument.text;
  }
  return undefined;
}

export function collectHookFlagNames(
  sourceFile: ts.SourceFile,
  functionNames: readonly string[]
): string[] {
  const flags: string[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      functionNames.includes(node.expression.text)
    ) {
      const flag = getStringArgument(node);
      if (flag !== undefined && !flags.includes(flag)) flags.push(flag);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return flags;
}

export function loadFlagHookNames(config: FeatureMapAppConfig): string[] {
  return collectHookFlagNames(
    parseSourceFile(config.featureFlagsFile),
    config.featureFlagHooks ?? []
  );
}

export function collectEndpointReferences(
  sourceFile: ts.SourceFile,
  endpointNames: ReadonlySet<string>
): Map<string, number> {
  const references = new Map<string, number>();
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      endpointNames.has(node.expression.text) &&
      endpointMemberNames.includes(node.name.text) &&
      !references.has(node.expression.text)
    ) {
      references.set(node.expression.text, getLine(sourceFile, node));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return references;
}

export function loadRpcDispatchHandlers(config: FeatureMapAppConfig): Map<string, RpcHandler> {
  const endpoints = loadRpcEndpointNames(config);
  const handlers = new Map<string, RpcHandler>();
  for (const file of config.rpcDispatchFiles ?? []) {
    const references = collectEndpointReferences(parseSourceFile(file), new Set(endpoints.keys()));
    for (const [endpoint, line] of references) {
      const method = endpoints.get(endpoint);
      if (method === undefined || handlers.has(method)) continue;
      handlers.set(method, { name: method, file, line, methods: [method] });
    }
  }
  return handlers;
}
