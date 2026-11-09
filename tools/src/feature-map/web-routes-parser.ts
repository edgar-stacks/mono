import path from 'node:path';
import ts from 'typescript';

import { toRepoRelative } from './app-config.js';
import {
  type RouteReference,
  type RoutedRoute,
  type RouterModel,
  createImportResolver,
} from './routers-parser.js';
import {
  type StringTable,
  evaluateStringExpression,
  getLine,
  getPropertyName,
  parseSourceFile,
  unwrapExpression,
} from './ts-ast.js';

const routeHelpersModule = '@react-router/dev/routes';
const routeHelpers = ['index', 'route', 'layout', 'prefix'] as const;
type RouteHelper = (typeof routeHelpers)[number];
const mapMethodName = 'map';
const rootPath = '/';

export interface WebRouteConfigOptions {
  readonly routeConfigFile: string;
  readonly table: StringTable;
  readonly objectName: string;
  readonly importAliases?: Readonly<Record<string, string>>;
  readonly layoutGates?: Readonly<Record<string, string>>;
  readonly conditionFlags?: Readonly<Record<string, string>>;
}

interface WebRouteConfigResult {
  readonly router: RouterModel;
  readonly errors: readonly string[];
}

interface ImportBinding {
  readonly specifier: string;
  readonly importedName: string;
}

interface ModuleScope {
  readonly sourceFile: ts.SourceFile;
  readonly locals: ReadonlyMap<string, ts.Expression>;
  readonly imports: ReadonlyMap<string, ImportBinding>;
  readonly helpers: ReadonlyMap<string, RouteHelper>;
}

interface MountContext {
  readonly scope: ModuleScope;
  readonly table: StringTable;
  readonly parentPath: string;
  readonly gates: readonly string[];
  readonly flags: readonly string[];
  readonly parentKeys: readonly string[];
}

interface ParseState {
  readonly options: WebRouteConfigOptions;
  readonly appDir: string;
  resolveModule(specifier: string, fromFile: string): ModuleScope | undefined;
  readonly routes: RoutedRoute[];
  readonly errors: string[];
}

function findRouteHelper(name: string): RouteHelper | undefined {
  return routeHelpers.find(helper => helper === name);
}

function collectModuleScope(sourceFile: ts.SourceFile): ModuleScope {
  const locals = new Map<string, ts.Expression>();
  const imports = new Map<string, ImportBinding>();
  const helpers = new Map<string, RouteHelper>();
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (specifier === routeHelpersModule) {
          const helper = findRouteHelper(importedName);
          if (helper) helpers.set(element.name.text, helper);
          continue;
        }
        imports.set(element.name.text, { specifier, importedName });
      }
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        locals.set(declaration.name.text, declaration.initializer);
      }
    }
  }
  return { sourceFile, locals, imports, helpers };
}

function findDefaultExport(sourceFile: ts.SourceFile): ts.Expression | undefined {
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) return statement.expression;
  }
  return undefined;
}

function joinPath(parent: string, own: string): string {
  if (own === '') return parent;
  if (parent === '' || parent === rootPath) return `/${own}`;
  return `${parent}/${own}`;
}

function mountedPathOf(path: string): string {
  return path === '' ? rootPath : path;
}

function keysWithValue(context: MountContext, state: ParseState, value: string): string[] {
  const values = context.table.get(state.options.objectName);
  if (!values) return [];
  return [...values.entries()].filter(([, candidate]) => candidate === value).map(([key]) => key);
}

function report(state: ParseState, context: MountContext, node: ts.Node, message: string) {
  const { sourceFile } = context.scope;
  state.errors.push(
    `${toRepoRelative(sourceFile.fileName)}:${getLine(sourceFile, node)}: ${message}`
  );
}

function nodeText(node: ts.Node): string {
  return node.getText().replace(/\s+/g, ' ');
}

function evaluateString(
  node: ts.Expression | undefined,
  context: MountContext,
  state: ParseState,
  call: ts.CallExpression,
  field: string
): string | undefined {
  if (!node) {
    report(state, context, call, `${field} is missing in ${nodeText(call)}`);
    return undefined;
  }
  const evaluated = evaluateStringExpression(node, context.table);
  if (!evaluated) {
    report(state, context, node, `${field} '${nodeText(node)}' could not be resolved`);
    return undefined;
  }
  return evaluated.value;
}

function mountRoute(
  call: ts.CallExpression,
  context: MountContext,
  state: ParseState,
  ownPath: string,
  module: string
) {
  const mountedPath = mountedPathOf(joinPath(context.parentPath, ownPath));
  const keys = keysWithValue(context, state, mountedPath);
  state.routes.push({
    file: context.scope.sourceFile.fileName,
    line: getLine(context.scope.sourceFile, call),
    keys,
    path: ownPath,
    mountedPath,
    gates: context.gates,
    flags: context.flags,
    parentKeys: context.parentKeys,
    isIndex: false,
    module: path.join(state.appDir, module),
  });
  return keys;
}

function childrenArgument(call: ts.CallExpression, from: number): ts.Expression | undefined {
  return call.arguments.slice(from).find(argument => {
    const expression = unwrapExpression(argument);
    return !ts.isObjectLiteralExpression(expression);
  });
}

function mountHelper(
  helper: RouteHelper,
  call: ts.CallExpression,
  context: MountContext,
  state: ParseState
) {
  if (helper === 'index') {
    const module = evaluateString(call.arguments[0], context, state, call, 'route module');
    if (module !== undefined) mountRoute(call, context, state, '', module);
    return;
  }
  if (helper === 'route') {
    const ownPath = evaluateString(call.arguments[0], context, state, call, 'route path');
    const module = evaluateString(call.arguments[1], context, state, call, 'route module');
    if (ownPath === undefined || module === undefined) return;
    const keys = mountRoute(call, context, state, ownPath, module);
    const children = childrenArgument(call, 2);
    if (!children) return;
    mountEntries(
      children,
      {
        ...context,
        parentPath: joinPath(context.parentPath, ownPath),
        parentKeys: [...context.parentKeys, ...keys],
      },
      state
    );
    return;
  }
  if (helper === 'layout') {
    const module = evaluateString(call.arguments[0], context, state, call, 'layout module');
    const children = childrenArgument(call, 1);
    if (module === undefined || !children) return;
    const gate = state.options.layoutGates?.[module];
    mountEntries(
      children,
      { ...context, gates: gate === undefined ? context.gates : [...context.gates, gate] },
      state
    );
    return;
  }
  const ownPath = evaluateString(call.arguments[0], context, state, call, 'prefix path');
  const children = childrenArgument(call, 1);
  if (ownPath === undefined) return;
  if (!children) {
    report(state, context, call, `prefix children are missing in ${nodeText(call)}`);
    return;
  }
  mountEntries(children, { ...context, parentPath: joinPath(context.parentPath, ownPath) }, state);
}

function readStringObject(
  node: ts.Expression,
  table: StringTable
): Map<string, string> | undefined {
  const expression = unwrapExpression(node);
  if (!ts.isObjectLiteralExpression(expression)) return undefined;
  const values = new Map<string, string>();
  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = getPropertyName(property.name);
    const value = evaluateStringExpression(property.initializer, table);
    if (name !== undefined && value) values.set(name, value.value);
  }
  return values;
}

interface ResolvedExpression {
  readonly expression: ts.Expression;
  readonly scope: ModuleScope;
}

function resolveIdentifier(
  name: string,
  context: MountContext,
  state: ParseState,
  node: ts.Node
): ResolvedExpression | undefined {
  const local = context.scope.locals.get(name);
  if (local) return { expression: local, scope: context.scope };
  const binding = context.scope.imports.get(name);
  if (!binding) {
    report(state, context, node, `'${name}' is not declared or imported in this file`);
    return undefined;
  }
  const scope = state.resolveModule(binding.specifier, context.scope.sourceFile.fileName);
  const expression = scope?.locals.get(binding.importedName);
  if (!scope || !expression) {
    report(
      state,
      context,
      node,
      `import '${binding.importedName}' from '${binding.specifier}' could not be resolved to a const in a route file`
    );
    return undefined;
  }
  return { expression, scope };
}

function mountMappedArray(call: ts.CallExpression, context: MountContext, state: ParseState) {
  if (!ts.isPropertyAccessExpression(call.expression)) return;
  const target = call.expression.expression;
  const callback = call.arguments[0] ? unwrapExpression(call.arguments[0]) : undefined;
  if (
    !ts.isIdentifier(target) ||
    !callback ||
    !ts.isArrowFunction(callback) ||
    !ts.isExpression(callback.body)
  ) {
    report(state, context, call, `unsupported map expression ${nodeText(call)}`);
    return;
  }
  const parameter = callback.parameters[0];
  if (!parameter || !ts.isIdentifier(parameter.name)) {
    report(state, context, call, `map callback needs a named parameter in ${nodeText(call)}`);
    return;
  }
  const resolved = resolveIdentifier(target.text, context, state, target);
  if (!resolved) return;
  const array = unwrapExpression(resolved.expression);
  if (!ts.isArrayLiteralExpression(array)) {
    report(state, context, target, `'${target.text}' is not an array literal`);
    return;
  }
  const parameterName = parameter.name.text;
  const body = callback.body;
  for (const element of array.elements) {
    const values = readStringObject(element, context.table);
    if (!values) {
      report(state, context, target, `an element of '${target.text}' is not an object literal`);
      continue;
    }
    const table = new Map(context.table);
    table.set(parameterName, values);
    mountEntry(body, { ...context, table }, state);
  }
}

function mountCall(call: ts.CallExpression, context: MountContext, state: ParseState) {
  if (ts.isIdentifier(call.expression)) {
    const helper = context.scope.helpers.get(call.expression.text);
    if (helper) {
      mountHelper(helper, call, context, state);
      return;
    }
  }
  if (
    ts.isPropertyAccessExpression(call.expression) &&
    call.expression.name.text === mapMethodName
  ) {
    mountMappedArray(call, context, state);
    return;
  }
  report(
    state,
    context,
    call,
    `unknown route helper ${nodeText(call.expression)}; use ${routeHelpers.join(', ')} from ${routeHelpersModule}`
  );
}

function mountConditional(
  conditional: ts.ConditionalExpression,
  context: MountContext,
  state: ParseState
) {
  const condition = nodeText(conditional.condition);
  const flag = state.options.conditionFlags?.[condition];
  if (flag === undefined) {
    report(
      state,
      context,
      conditional.condition,
      `unknown route condition '${condition}'; add it to conditionFlags in tools/src/feature-map/app-config.ts`
    );
    return;
  }
  mountEntries(conditional.whenTrue, { ...context, flags: [...context.flags, flag] }, state);
  mountEntries(conditional.whenFalse, context, state);
}

function mountEntry(node: ts.Expression, context: MountContext, state: ParseState) {
  const expression = unwrapExpression(node);
  if (ts.isCallExpression(expression)) {
    mountCall(expression, context, state);
    return;
  }
  mountEntries(expression, context, state);
}

function mountEntries(node: ts.Expression, context: MountContext, state: ParseState) {
  const expression = unwrapExpression(node);
  if (ts.isArrayLiteralExpression(expression)) {
    for (const element of expression.elements) {
      if (ts.isSpreadElement(element)) {
        mountEntries(element.expression, context, state);
        continue;
      }
      mountEntry(element, context, state);
    }
    return;
  }
  if (ts.isIdentifier(expression)) {
    const resolved = resolveIdentifier(expression.text, context, state, expression);
    if (resolved) mountEntries(resolved.expression, { ...context, scope: resolved.scope }, state);
    return;
  }
  if (ts.isConditionalExpression(expression)) {
    mountConditional(expression, context, state);
    return;
  }
  if (ts.isCallExpression(expression)) {
    mountCall(expression, context, state);
    return;
  }
  report(state, context, expression, `unsupported route config expression ${nodeText(expression)}`);
}

function collectReferences(routes: readonly RoutedRoute[]): Map<string, RouteReference[]> {
  const references = new Map<string, RouteReference[]>();
  for (const route of routes) {
    for (const key of route.keys) {
      const list = references.get(key) ?? [];
      list.push({ key, file: route.file, line: route.line });
      references.set(key, list);
    }
  }
  return references;
}

export function parseWebRouteConfig(
  options: WebRouteConfigOptions,
  read: (file: string) => string | undefined
): WebRouteConfigResult {
  const resolver = createImportResolver(options.importAliases ?? {}, read);
  const scopes = new Map<ts.SourceFile, ModuleScope>();
  function scopeOf(sourceFile: ts.SourceFile): ModuleScope {
    const cached = scopes.get(sourceFile);
    if (cached) return cached;
    const scope = collectModuleScope(sourceFile);
    scopes.set(sourceFile, scope);
    return scope;
  }
  const state: ParseState = {
    options,
    appDir: path.dirname(options.routeConfigFile),
    resolveModule(specifier, fromFile) {
      const sourceFile = resolver.resolve(specifier, fromFile);
      return sourceFile ? scopeOf(sourceFile) : undefined;
    },
    routes: [],
    errors: [],
  };
  const label = toRepoRelative(options.routeConfigFile);
  const text = read(options.routeConfigFile);
  const emptyRouter: RouterModel = { routes: [], references: new Map(), unresolved: [] };
  if (text === undefined) {
    return { router: emptyRouter, errors: [`${label}: the route config file could not be read`] };
  }
  const root = parseSourceFile(options.routeConfigFile, text);
  const exported = findDefaultExport(root);
  if (!exported) {
    return { router: emptyRouter, errors: [`${label}: no default export with the route config`] };
  }
  mountEntries(
    exported,
    {
      scope: scopeOf(root),
      table: options.table,
      parentPath: '',
      gates: [],
      flags: [],
      parentKeys: [],
    },
    state
  );
  return {
    router: { routes: state.routes, references: collectReferences(state.routes), unresolved: [] },
    errors: state.errors,
  };
}
