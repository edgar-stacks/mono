import ts from 'typescript';

import { toRepoRelative } from './app-config.js';
import {
  type ImportAliases,
  type RouteReference,
  type RoutedRoute,
  type RouterModel,
  createImportResolver,
  joinPath,
  readFromDisk,
} from './routers-parser.js';
import {
  type StringTable,
  evaluateStringExpression,
  getLine,
  getPropertyName,
  hasExportModifier,
  mergeStringTables,
  parseSourceFile,
  unwrapExpression,
} from './ts-ast.js';

const routeHelpersModule = '@react-router/dev/routes';
const routeHelpers = ['index', 'route', 'layout', 'prefix'] as const;
type RouteHelper = (typeof routeHelpers)[number];

const mapMethodName = 'map';
const rootPath = '/';
const appConfigFile = 'tools/src/feature-map/app-config.ts';

export interface WebRoutesOptions {
  readonly table: StringTable;
  readonly objectName: string;
  readonly aliases: ImportAliases;
  readonly layoutGates: Readonly<Record<string, string>>;
  readonly conditionFlags: Readonly<Record<string, string>>;
  read?(file: string): string | undefined;
}

interface WebRoutesParseResult {
  readonly router: RouterModel;
  readonly errors: readonly string[];
}

interface ImportedBinding {
  readonly specifier: string;
  readonly importedName: string;
}

interface FileScope {
  readonly sourceFile: ts.SourceFile;
  readonly imports: ReadonlyMap<string, ImportedBinding>;
  readonly locals: ReadonlyMap<string, ts.Expression>;
  readonly exported: ReadonlyMap<string, ts.Expression>;
  readonly helpers: ReadonlyMap<string, RouteHelper>;
}

interface WalkScope {
  readonly file: FileScope;
  readonly table: StringTable;
}

interface WalkContext {
  readonly parentPath: string;
  readonly gates: readonly string[];
  readonly flags: readonly string[];
  readonly parentKeys: readonly string[];
}

interface ResolvedExpression {
  readonly expression: ts.Expression;
  readonly file: FileScope;
}

const rootContext: WalkContext = { parentPath: '', gates: [], flags: [], parentKeys: [] };

function normalizeCondition(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function collectFileScope(sourceFile: ts.SourceFile): FileScope {
  const imports = new Map<string, ImportedBinding>();
  const locals = new Map<string, ts.Expression>();
  const exported = new Map<string, ts.Expression>();
  const helpers = new Map<string, RouteHelper>();
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        const importedName = (element.propertyName ?? element.name).text;
        const localName = element.name.text;
        if (specifier === routeHelpersModule) {
          const helper = routeHelpers.find(name => name === importedName);
          if (helper) helpers.set(localName, helper);
          continue;
        }
        imports.set(localName, { specifier, importedName });
      }
      continue;
    }
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      exported.set('default', statement.expression);
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    const isExported = hasExportModifier(statement);
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      locals.set(declaration.name.text, declaration.initializer);
      if (isExported) exported.set(declaration.name.text, declaration.initializer);
    }
  }
  return { sourceFile, imports, locals, exported, helpers };
}

function readStringProperties(node: ts.ObjectLiteralExpression): Map<string, string> {
  const values = new Map<string, string>();
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = getPropertyName(property.name);
    const initializer = unwrapExpression(property.initializer);
    if (name === undefined) continue;
    if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
      values.set(name, initializer.text);
    }
  }
  return values;
}

function arrowBody(fn: ts.ArrowFunction | ts.FunctionExpression): ts.Expression | undefined {
  if (!ts.isBlock(fn.body)) return fn.body;
  const [statement] = fn.body.statements;
  if (fn.body.statements.length !== 1 || !statement || !ts.isReturnStatement(statement)) {
    return undefined;
  }
  return statement.expression;
}

function childrenArgument(
  call: ts.CallExpression,
  firstChildIndex: number
): ts.Expression | undefined {
  const candidate = call.arguments[firstChildIndex];
  if (candidate && ts.isObjectLiteralExpression(unwrapExpression(candidate))) {
    return call.arguments[firstChildIndex + 1];
  }
  return candidate;
}

class WebRoutesWalker {
  readonly routes: RoutedRoute[] = [];
  readonly errors: string[] = [];
  private readonly files = new Map<string, FileScope>();
  private readonly options: WebRoutesOptions;
  private readonly resolver: ReturnType<typeof createImportResolver>;

  constructor(options: WebRoutesOptions) {
    this.options = options;
    this.resolver = createImportResolver(options.aliases, options.read ?? readFromDisk);
  }

  fileScope(sourceFile: ts.SourceFile): FileScope {
    const cached = this.files.get(sourceFile.fileName);
    if (cached) return cached;
    const scope = collectFileScope(sourceFile);
    this.files.set(sourceFile.fileName, scope);
    return scope;
  }

  private fail(scope: WalkScope, node: ts.Node, message: string) {
    const sourceFile = scope.file.sourceFile;
    this.errors.push(
      `${toRepoRelative(sourceFile.fileName)}:${getLine(sourceFile, node)}: ${message}`
    );
  }

  private resolveIdentifier(
    scope: WalkScope,
    identifier: ts.Identifier
  ): ResolvedExpression | undefined {
    const name = identifier.text;
    const local = scope.file.locals.get(name);
    if (local) return { expression: local, file: scope.file };
    const imported = scope.file.imports.get(name);
    if (!imported) {
      this.fail(scope, identifier, `unknown identifier '${name}' in the route config`);
      return undefined;
    }
    const target = this.resolver.resolve(imported.specifier, scope.file.sourceFile.fileName);
    if (!target) {
      this.fail(
        scope,
        identifier,
        `unknown import '${imported.specifier}' for '${name}'; the parser follows relative and ${Object.keys(this.options.aliases).join(', ')} imports only`
      );
      return undefined;
    }
    const file = this.fileScope(target);
    const expression = file.exported.get(imported.importedName);
    if (!expression) {
      this.fail(
        scope,
        identifier,
        `'${imported.importedName}' is not an exported variable of ${toRepoRelative(target.fileName)}`
      );
      return undefined;
    }
    return { expression, file };
  }

  private evaluate(scope: WalkScope, node: ts.Expression | undefined, what: string) {
    if (!node) return undefined;
    const evaluated = evaluateStringExpression(node, scope.table);
    if (!evaluated) {
      this.fail(scope, node, `could not resolve the ${what} ${node.getText()}`);
      return undefined;
    }
    return evaluated.value;
  }

  private keysFor(mountedPath: string): string[] {
    const values = this.options.table.get(this.options.objectName);
    if (!values) return [];
    return [...values.entries()].filter(([, value]) => value === mountedPath).map(([key]) => key);
  }

  private record(
    scope: WalkScope,
    node: ts.Node,
    context: WalkContext,
    route: { path: string; mountedPath: string; module: string; isIndex: boolean }
  ): RoutedRoute {
    const routed: RoutedRoute = {
      file: scope.file.sourceFile.fileName,
      line: getLine(scope.file.sourceFile, node),
      keys: this.keysFor(route.mountedPath),
      path: route.path,
      mountedPath: route.mountedPath,
      gates: context.gates,
      flags: context.flags,
      parentKeys: context.parentKeys,
      isIndex: route.isIndex,
      module: route.module,
    };
    this.routes.push(routed);
    return routed;
  }

  private walkHelper(
    helper: RouteHelper,
    call: ts.CallExpression,
    context: WalkContext,
    scope: WalkScope
  ) {
    if (helper === 'index') {
      const module = this.evaluate(scope, call.arguments[0], 'route module');
      if (module === undefined) return;
      const mountedPath = context.parentPath || rootPath;
      this.record(scope, call, context, { path: '', mountedPath, module, isIndex: true });
      return;
    }
    if (helper === 'route') {
      const ownPath = this.evaluate(scope, call.arguments[0], 'route path');
      const module = this.evaluate(scope, call.arguments[1], 'route module');
      if (ownPath === undefined || module === undefined) return;
      const mountedPath = joinPath(context.parentPath, ownPath);
      const routed = this.record(scope, call, context, {
        path: ownPath,
        mountedPath,
        module,
        isIndex: false,
      });
      const children = childrenArgument(call, 2);
      if (children) {
        this.walk(
          children,
          {
            ...context,
            parentPath: mountedPath,
            parentKeys: [...context.parentKeys, ...routed.keys],
          },
          scope
        );
      }
      return;
    }
    if (helper === 'layout') {
      const module = this.evaluate(scope, call.arguments[0], 'layout module');
      const children = childrenArgument(call, 1);
      if (module === undefined || !children) return;
      const gate = this.options.layoutGates[module];
      this.walk(
        children,
        { ...context, gates: gate === undefined ? context.gates : [...context.gates, gate] },
        scope
      );
      return;
    }
    const ownPrefix = this.evaluate(scope, call.arguments[0], 'prefix');
    const children = call.arguments[1];
    if (ownPrefix === undefined || !children) return;
    this.walk(children, { ...context, parentPath: joinPath(context.parentPath, ownPrefix) }, scope);
  }

  private walkMap(call: ts.CallExpression, context: WalkContext, scope: WalkScope): boolean {
    const callee = call.expression;
    if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== mapMethodName) return false;
    const [callback] = call.arguments;
    if (!callback || !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
      return false;
    }
    const [parameter] = callback.parameters;
    const body = arrowBody(callback);
    if (!parameter || !ts.isIdentifier(parameter.name) || !body) return false;
    const target = unwrapExpression(callee.expression);
    const resolved = ts.isIdentifier(target)
      ? this.resolveIdentifier(scope, target)
      : { expression: target, file: scope.file };
    if (!resolved) return true;
    const array = unwrapExpression(resolved.expression);
    if (!ts.isArrayLiteralExpression(array)) {
      this.fail(scope, call, `'${callee.expression.getText()}' is not an array literal`);
      return true;
    }
    const parameterName = parameter.name.text;
    for (const element of array.elements) {
      const item = unwrapExpression(element);
      if (!ts.isObjectLiteralExpression(item)) {
        this.fail(scope, call, `an item of '${callee.expression.getText()}' is not an object`);
        continue;
      }
      const table = mergeStringTables([
        scope.table,
        new Map([[parameterName, readStringProperties(item)]]),
      ]);
      this.walk(body, context, { ...scope, table });
    }
    return true;
  }

  private walkCall(call: ts.CallExpression, context: WalkContext, scope: WalkScope) {
    if (ts.isIdentifier(call.expression)) {
      const helper = scope.file.helpers.get(call.expression.text);
      if (helper) {
        this.walkHelper(helper, call, context, scope);
        return;
      }
    }
    if (this.walkMap(call, context, scope)) return;
    this.fail(
      scope,
      call,
      `unknown helper ${call.expression.getText()}(); use ${routeHelpers.join(', ')} from ${routeHelpersModule}, a spread or <array>.map`
    );
  }

  private walkConditional(
    conditional: ts.ConditionalExpression,
    context: WalkContext,
    scope: WalkScope
  ) {
    const condition = normalizeCondition(conditional.condition.getText());
    const flag = this.options.conditionFlags[condition];
    if (flag === undefined) {
      this.fail(
        scope,
        conditional,
        `unknown condition '${condition}'; add it to conditionFlags in ${appConfigFile}`
      );
      return;
    }
    this.walk(conditional.whenTrue, { ...context, flags: [...context.flags, flag] }, scope);
    this.walk(conditional.whenFalse, context, scope);
  }

  walk(node: ts.Expression, context: WalkContext, scope: WalkScope) {
    const expression = unwrapExpression(node);
    if (ts.isArrayLiteralExpression(expression)) {
      for (const element of expression.elements) {
        this.walk(ts.isSpreadElement(element) ? element.expression : element, context, scope);
      }
      return;
    }
    if (ts.isCallExpression(expression)) {
      this.walkCall(expression, context, scope);
      return;
    }
    if (ts.isIdentifier(expression)) {
      const resolved = this.resolveIdentifier(scope, expression);
      if (resolved) this.walk(resolved.expression, context, { ...scope, file: resolved.file });
      return;
    }
    if (ts.isConditionalExpression(expression)) {
      this.walkConditional(expression, context, scope);
      return;
    }
    this.fail(scope, expression, `unsupported route config expression ${expression.getText()}`);
  }
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

export function parseWebRoutes(file: string, options: WebRoutesOptions): WebRoutesParseResult {
  const read = options.read ?? readFromDisk;
  const text = read(file);
  if (text === undefined) {
    return {
      router: { routes: [], references: new Map(), unresolved: [] },
      errors: [`${toRepoRelative(file)}: route config file not found`],
    };
  }
  const walker = new WebRoutesWalker(options);
  const scope = walker.fileScope(parseSourceFile(file, text));
  const config = scope.exported.get('default');
  if (!config) {
    return {
      router: { routes: [], references: new Map(), unresolved: [] },
      errors: [`${toRepoRelative(file)}: no default export; export the route config as default`],
    };
  }
  walker.walk(config, rootContext, { file: scope, table: options.table });
  return {
    router: {
      routes: walker.routes,
      references: collectReferences(walker.routes),
      unresolved: [],
    },
    errors: walker.errors,
  };
}
