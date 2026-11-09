import path from 'node:path';

import { type ParsedFeature } from '../feature-map/features-parser.js';
import { type FeatureMapModel, substituteParams } from '../feature-map/model.js';
import { parseStateSlices } from './state-evidence.js';
import {
  type VerifyAccountType,
  type VerifyOpenAction,
  type VerifyRpcRun,
  type VerifyRun,
  type VerifySession,
  verifyAccountTypes,
  verifySessions,
} from './verify-contract.js';

export interface VerifyCliOptions {
  readonly feature?: string;
  readonly route?: string;
  readonly signedIn?: boolean;
  readonly signedOut?: boolean;
  readonly locked?: boolean;
  readonly accountType?: string;
  readonly network?: string;
  readonly flags?: string;
  readonly mocks?: string;
  readonly ready?: string;
  readonly rpc?: string;
  readonly params?: string;
  readonly state?: string;
  readonly connectTestApp?: boolean;
  readonly allowConsoleErrors?: boolean;
  readonly out?: string;
  readonly timeout?: string;
}

interface ResolveContext {
  readonly model: FeatureMapModel;
  readonly now: Date;
  readonly resultsDir: string;
  readonly cwd: string;
  readParams(file: string): unknown;
}

type ResolveResult =
  | { readonly run: VerifyRun; readonly errors?: undefined }
  | { readonly run?: undefined; readonly errors: readonly string[] };

const defaultVerifyTimeoutMs = 30_000;
const defaultVerifyMocks = ['setupMockApis', 'mockUnhandledRequests'] as const;
const defaultNetwork = 'mainnet';
const defaultAccountType: VerifyAccountType = 'software';
const defaultSession: VerifySession = 'signed-in';
const homeRoute = '/';
const catalogPrefix = 'catalog:';
const mocksDefault = 'default';
const mocksNone = 'none';
const unresolvedSegment = /^(:|\{|\*)/;

export function verifyBlocker(
  feature: ParsedFeature,
  hasReady = feature.selectors.ready !== undefined
): string | undefined {
  if (feature.anchor.kind === 'behavior') {
    return 'a behavior entry has no screen to open; reproduce it through its specs';
  }
  if (!hasReady) {
    return 'the entry has no selectors.ready, so a run has nothing to wait for';
  }
  if (feature.anchor.kind === 'selectors' && feature.open.length === 0) {
    return 'a selectors entry needs an open action that reveals it; none is listed';
  }
  if (!feature.deepLinkable && feature.open.length === 0) {
    return 'the screen is not deep-linkable and no open action reaches it';
  }
  if (feature.anchor.kind === 'rpc' && rpcMethodOf(feature) === undefined) {
    return 'the rpc entry names no method in its entry points';
  }
  return undefined;
}

export function verifyCommand(feature: ParsedFeature, app: string): string {
  return `pnpm lt verify ${app} --feature ${feature.id}`;
}

function rpcMethodOf(feature: ParsedFeature): string | undefined {
  return feature.entry.find(point => point.method !== undefined)?.method;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function utcStamp(date: Date): string {
  const day = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  const time = `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  return `${day}-${time}`;
}

export function routeSlug(route: string): string {
  const slug = route
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `route-${slug || 'home'}`;
}

function routeMatches(pattern: string, value: string): boolean {
  const patternSegments = pattern.split('/');
  const valueSegments = value.split('/');
  for (const [index, segment] of patternSegments.entries()) {
    if (segment === '*') return valueSegments.length > index;
    const actual = valueSegments[index];
    if (actual === undefined) return false;
    if (unresolvedSegment.test(segment)) {
      if (actual.length === 0) return false;
      continue;
    }
    if (segment !== actual) return false;
  }
  return patternSegments.length === valueSegments.length;
}

function featureForRoute(model: FeatureMapModel, route: string): ParsedFeature | undefined {
  return model.features.find(
    feature =>
      feature.anchor.kind === 'route' &&
      feature.routes.some(item => item.value.startsWith('/') && routeMatches(item.value, route))
  );
}

function parseSession(options: VerifyCliOptions, errors: string[]): VerifySession | undefined {
  const requested: Readonly<Record<VerifySession, boolean>> = {
    'signed-in': options.signedIn ?? false,
    'signed-out': options.signedOut ?? false,
    locked: options.locked ?? false,
  };
  const chosen = verifySessions.filter(session => requested[session]);
  if (chosen.length > 1) {
    errors.push(
      `choose one of --signed-in, --signed-out and --locked, not ${chosen.join(' and ')}`
    );
  }
  return chosen[0];
}

function parseAccountType(
  value: string | undefined,
  errors: string[]
): VerifyAccountType | undefined {
  if (value === undefined) return undefined;
  const match = verifyAccountTypes.find(type => type === value);
  if (!match) errors.push(`--account-type must be one of ${verifyAccountTypes.join(', ')}`);
  return match;
}

function parseFlags(
  value: string | undefined,
  known: readonly string[],
  errors: string[]
): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  if (value === undefined) return flags;
  for (const pair of value.split(',').map(item => item.trim())) {
    if (pair.length === 0) continue;
    const [name = '', setting, ...rest] = pair.split('=');
    if ((setting !== 'true' && setting !== 'false') || rest.length > 0) {
      errors.push(`--flags: '${pair}' must look like name=true or name=false`);
      continue;
    }
    if (!known.includes(name)) {
      errors.push(`--flags: '${name}' is not a feature flag. Use one of ${known.join(', ')}.`);
      continue;
    }
    flags[name] = setting === 'true';
  }
  return flags;
}

function parseTimeout(value: string | undefined, errors: string[]): number {
  if (value === undefined) return defaultVerifyTimeoutMs;
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout <= 0) {
    errors.push('--timeout must be a positive number of milliseconds');
    return defaultVerifyTimeoutMs;
  }
  return timeout;
}

function parseOpenActions(
  model: FeatureMapModel,
  actions: readonly string[],
  errors: string[]
): VerifyOpenAction[] {
  return actions.flatMap(action => {
    const [className = '', method = ''] = action.split('.');
    const found = model.pageObjectActions.get(action);
    const callable =
      found !== undefined &&
      model.config.verifyPageObjects.includes(className) &&
      !found.isStatic &&
      found.requiredParameters === 0;
    if (!callable) {
      errors.push(
        `open action '${action}' is not a zero-argument instance method of a fixture page object; run pnpm lt feature-map check`
      );
      return [];
    }
    return [{ className, method }];
  });
}

interface MocksResult {
  readonly mocks: VerifyRun['mocks'];
}

function resolveMocks(
  model: FeatureMapModel,
  value: string | undefined,
  feature: ParsedFeature | undefined,
  errors: string[]
): MocksResult {
  if (value === mocksNone) return { mocks: { mode: 'none' } };
  if (value === undefined || value === mocksDefault) {
    const names = feature?.preconditions.mocks ?? defaultVerifyMocks;
    return { mocks: { mode: 'list', names: [...names] } };
  }
  const names = value
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0);
  for (const name of names) {
    if (model.mocks.has(name)) continue;
    errors.push(
      `--mocks: '${name}' is not exported from ${path.basename(model.config.mocksDir)}; use default, none or mock function names`
    );
  }
  return { mocks: { mode: 'list', names } };
}

interface RpcTarget {
  readonly method: string;
  readonly catalogId?: string;
}

function rpcTarget(
  model: FeatureMapModel,
  requested: string | undefined,
  feature: ParsedFeature | undefined,
  errors: string[]
): RpcTarget | undefined {
  if (requested?.startsWith(catalogPrefix)) {
    const catalogId = requested.slice(catalogPrefix.length);
    const entry = model.rpcCatalog.get(catalogId);
    if (entry) return { method: entry.method, catalogId };
    errors.push(
      `--rpc: '${catalogId}' is not a test-app catalog id. Use one of ${[...model.rpcCatalog.keys()].join(', ')}.`
    );
    return undefined;
  }
  const method = requested ?? (feature ? rpcMethodOf(feature) : undefined);
  if (method === undefined) {
    errors.push('the rpc entry names no method; pass --rpc <method>');
    return undefined;
  }
  if (!model.rpcMethods.has(method)) {
    errors.push(`--rpc: '${method}' is not an RPC method defined in packages/rpc`);
    return undefined;
  }
  const catalogId = [...model.rpcCatalog.values()].find(entry => entry.method === method)?.id;
  return { method, catalogId };
}

interface RpcInput {
  readonly model: FeatureMapModel;
  readonly options: VerifyCliOptions;
  readonly feature: ParsedFeature | undefined;
  readonly context: ResolveContext;
  readonly errors: string[];
}

function resolveRpc({
  model,
  options,
  feature,
  context,
  errors,
}: RpcInput): VerifyRpcRun | undefined {
  const requested = options.rpc;
  const isRpcEntry = feature?.anchor.kind === 'rpc';
  if (requested === undefined && !isRpcEntry) {
    if (options.params !== undefined)
      errors.push('--params needs an rpc run (--rpc or an rpc entry)');
    return undefined;
  }

  const target = rpcTarget(model, requested, feature, errors);
  if (!target) return undefined;
  const { method, catalogId } = target;

  if (options.params !== undefined) {
    try {
      const params = context.readParams(path.resolve(context.cwd, options.params));
      return { method, params, paramsSource: 'file' };
    } catch (error) {
      errors.push(
        `--params: cannot read ${options.params} as JSON (${error instanceof Error ? error.message : String(error)})`
      );
      return undefined;
    }
  }
  if (catalogId === undefined) return { method, paramsSource: 'none' };
  return { method, catalogId, paramsSource: 'catalog' };
}

function entryRoute(
  feature: ParsedFeature,
  errors: string[]
): { route: string; open: readonly string[] } {
  const start = feature.startRoute?.value ?? homeRoute;
  if (feature.anchor.kind !== 'route' || !feature.deepLinkable) {
    return { route: substituteParams(start, feature.params), open: feature.open };
  }
  const first = feature.routes.find(route => route.value.startsWith('/'));
  if (!first) {
    errors.push(`entry '${feature.id}' lists no absolute route to open`);
    return { route: homeRoute, open: [] };
  }
  return { route: substituteParams(first.value, feature.params), open: feature.open };
}

function runTarget(
  options: VerifyCliOptions,
  feature: ParsedFeature | undefined,
  errors: string[]
): { route: string; open: readonly string[] } {
  if (options.route !== undefined) return { route: options.route, open: [] };
  if (!feature) return { route: homeRoute, open: [] };
  return entryRoute(feature, errors);
}

function checkRouteParams(route: string, errors: string[]): void {
  const unresolved = route.split('/').filter(segment => unresolvedSegment.test(segment));
  if (unresolved.length === 0) return;
  errors.push(
    `route '${route}' still has ${unresolved.join(', ')}; add params examples to the entry or pass a concrete --route`
  );
}

function selectFeature(
  model: FeatureMapModel,
  options: VerifyCliOptions,
  errors: string[]
): ParsedFeature | undefined {
  if (options.feature !== undefined && options.route !== undefined) {
    errors.push('pass --feature or --route, not both');
    return undefined;
  }
  if (options.feature === undefined && options.route === undefined) {
    errors.push('pass --feature <id> or --route <path>');
    return undefined;
  }
  if (options.route !== undefined) {
    if (!options.route.startsWith('/')) errors.push(`--route '${options.route}' must start with /`);
    return featureForRoute(model, options.route);
  }
  const feature = model.features.find(item => item.id === options.feature);
  if (!feature) {
    errors.push(
      `no feature-map entry has id '${options.feature}'; see the extension feature map for ids`
    );
    return undefined;
  }
  const blocker = verifyBlocker(
    feature,
    feature.selectors.ready !== undefined || options.ready !== undefined
  );
  if (blocker) errors.push(`entry '${feature.id}' cannot be verified: ${blocker}`);
  return feature;
}

export function resolveVerifyRun(
  options: VerifyCliOptions,
  context: ResolveContext
): ResolveResult {
  const { model } = context;
  const errors: string[] = [];
  const feature = selectFeature(model, options, errors);
  if (errors.length > 0) return { errors };

  const session = parseSession(options, errors) ?? feature?.preconditions.session ?? defaultSession;
  const accountType =
    parseAccountType(options.accountType, errors) ??
    parseAccountType(feature?.preconditions.accountType, errors) ??
    defaultAccountType;
  const network = options.network ?? feature?.preconditions.network ?? defaultNetwork;
  if (!model.networkIds.includes(network)) {
    errors.push(
      `--network '${network}' is not a network id. Use one of ${model.networkIds.join(', ')}.`
    );
  }
  if (accountType !== 'software' && network !== defaultNetwork) {
    errors.push(
      `a ${accountType} wallet is seeded on mainnet only; drop --network or use --account-type software`
    );
  }
  if (accountType === 'ledger' && session === 'locked') {
    errors.push(
      'a Ledger wallet has no password to lock; drop --locked or use another account type'
    );
  }

  const { mocks } = resolveMocks(model, options.mocks, feature, errors);
  if (mocks.mode === 'none' && options.flags !== undefined) {
    errors.push('--mocks none reads flags from the real LaunchDarkly, so --flags cannot apply');
  }
  const flags =
    mocks.mode === 'none'
      ? {}
      : {
          ...Object.fromEntries((feature?.flags ?? []).map(flag => [flag, true])),
          ...parseFlags(options.flags, model.flags, errors),
        };

  const target = runTarget(options, feature, errors);
  checkRouteParams(target.route, errors);
  const open = parseOpenActions(model, target.open, errors);

  const ready = options.ready ?? feature?.selectors.ready?.value;
  if (ready === undefined) errors.push('nothing to wait for: pass --ready <testId>');

  const rpc = resolveRpc({ model, options, feature, context, errors });
  if (rpc?.paramsSource === 'catalog' && session === 'locked') {
    errors.push(
      'catalog rpc runs build their params from the unlocked wallet; drop --locked or pass --params'
    );
  }

  const state = parseStateSlices(options.state, model.persistWhitelist);
  if ('error' in state) errors.push(state.error);
  const timeout = parseTimeout(options.timeout, errors);

  if (errors.length > 0 || ready === undefined || 'error' in state) return { errors };

  const label = options.feature ?? routeSlug(target.route);
  const outDir =
    options.out !== undefined
      ? path.resolve(context.cwd, options.out)
      : path.join(context.resultsDir, `${label}-${utcStamp(context.now)}`);

  return {
    run: {
      label,
      feature: feature?.id,
      route: target.route,
      open,
      session,
      accountType,
      network,
      flags,
      mocks,
      ready,
      rpc,
      stateSlices: [...state.slices],
      connectTestApp: options.connectTestApp ?? rpc !== undefined,
      allowConsoleErrors: options.allowConsoleErrors ?? false,
      outDir,
      timeout,
    },
  };
}
