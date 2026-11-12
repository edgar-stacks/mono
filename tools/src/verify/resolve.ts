import path from 'node:path';

import { type ParsedFeature } from '../feature-map/features-parser.js';
import { type FeatureMapModel, screenFeatures, substituteParams } from '../feature-map/model.js';
import { parseStateSlices } from './state-evidence.js';
import {
  type VerifyAccountType,
  type VerifyMocksMode,
  type VerifyPlan,
  type VerifyRpc,
  type VerifySession,
  defaultVerifyTimeoutMs,
  verifyAccountTypes,
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

interface VerifyEnvironment {
  readonly cwd: string;
  readonly now: Date;
  readParamsFile(file: string): string;
}

type ResolveResult =
  | { readonly ok: true; readonly plan: VerifyPlan; readonly outDir: string }
  | { readonly ok: false; readonly error: string };

type Step<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

const defaultMocks = ['setupMockApis', 'mockUnhandledRequests'] as const;
const defaultNetwork = 'mainnet';
const defaultAccountType: VerifyAccountType = 'software';
const rootRoute = '/';
const catalogPrefix = 'catalog:';
const mocksNone = 'none';
const mocksDefault = 'default';
const optionalParamSegment = /^:[^/]+\?$/;

function ok<T>(value: T): Step<T> {
  return { ok: true, value };
}

function fail<T>(error: string): Step<T> {
  return { ok: false, error };
}

function isRpcEntry(feature: ParsedFeature): boolean {
  if (feature.anchor.kind === 'rpc') return true;
  return feature.entry.length > 0 && feature.entry.every(point => point.kind === 'rpc');
}

function entryRpcMethod(feature: ParsedFeature): string | undefined {
  return feature.entry.find(point => point.method !== undefined)?.method;
}

interface BlockOverrides {
  readonly ready?: string;
  readonly rpc?: string;
}

export function verifyBlockReason(
  feature: ParsedFeature,
  overrides: BlockOverrides = {}
): string | undefined {
  if (feature.anchor.kind === 'behavior') {
    return 'a behavior entry has no screen to open; reproduce it through its specs';
  }
  if (feature.selectors.ready === undefined && overrides.ready === undefined) {
    return 'it has no selectors.ready, so a run has nothing to wait for';
  }
  if (feature.anchor.kind === 'selectors' && feature.open.length === 0) {
    return 'a selectors entry needs an open action and no page-object action reveals it';
  }
  const rpc = isRpcEntry(feature) || overrides.rpc !== undefined;
  if (!feature.deepLinkable && feature.open.length === 0 && !rpc) {
    return 'it is not deep-linkable and no open action reaches it';
  }
  if (rpc && entryRpcMethod(feature) === undefined && overrides.rpc === undefined) {
    return 'an rpc entry needs an entry point with a method to send';
  }
  return undefined;
}

export function verifyCommand(model: FeatureMapModel, feature: ParsedFeature): string {
  return `pnpm lt verify ${model.config.app} --feature ${feature.id}`;
}

function segmentPattern(segment: string): string {
  if (segment === '*') return '.*';
  if (segment.startsWith(':') || /^\{.+\}$/.test(segment)) return '[^/]+';
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function routeMatches(pattern: string, value: string): boolean {
  const source = pattern.split('/').map(segmentPattern).join('/');
  return new RegExp(`^${source}$`).test(value);
}

function normalizeRoute(value: string): string {
  const withoutHash = value.startsWith('#') ? value.slice(1) : value;
  return withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
}

function findFeatureForRoute(model: FeatureMapModel, value: string): ParsedFeature | undefined {
  const byKey = model.routeUrls.get(value);
  const target = byKey ?? normalizeRoute(value);
  const candidates = screenFeatures(model).filter(feature => feature.anchor.kind === 'route');
  const exact = candidates.find(feature => feature.routes.some(route => route.value === target));
  if (exact) return exact;
  return candidates.find(feature =>
    feature.routes.some(route => route.value.startsWith('/') && routeMatches(route.value, target))
  );
}

function routeForFeature(feature: ParsedFeature): Step<string> {
  const start =
    feature.startRoute?.value ?? feature.routes.find(route => route.value.startsWith('/'))?.value;
  if (start === undefined) return ok(rootRoute);
  const route = substituteParams(start, feature.params)
    .split('/')
    .filter(segment => !optionalParamSegment.test(segment))
    .join('/');
  const unresolved = route
    .split('/')
    .filter(segment => segment.startsWith(':') || segment === '*' || /^\{.+\}$/.test(segment));
  if (unresolved.length > 0) {
    return fail(
      `entry '${feature.id}': route '${start}' needs a params example for ${unresolved.join(', ')}. Fix: add it to params, or pass --route with a concrete path.`
    );
  }
  return ok(route);
}

function resolveSession(options: VerifyCliOptions, feature?: ParsedFeature): Step<VerifySession> {
  const picked: VerifySession[] = [];
  if (options.signedIn) picked.push('signed-in');
  if (options.signedOut) picked.push('signed-out');
  if (options.locked) picked.push('locked');
  if (picked.length > 1) {
    return fail(`pass at most one of --signed-in, --signed-out and --locked`);
  }
  return ok(picked[0] ?? feature?.preconditions.session ?? 'signed-in');
}

function resolveAccountType(
  options: VerifyCliOptions,
  feature?: ParsedFeature
): Step<VerifyAccountType> {
  const value = options.accountType ?? feature?.preconditions.accountType ?? defaultAccountType;
  const match = verifyAccountTypes.find(type => type === value);
  if (!match) {
    return fail(`--account-type '${value}' is not one of ${verifyAccountTypes.join(', ')}`);
  }
  return ok(match);
}

function resolveNetwork(
  model: FeatureMapModel,
  options: VerifyCliOptions,
  accountType: VerifyAccountType,
  feature?: ParsedFeature
): Step<string> {
  const network = options.network ?? feature?.preconditions.network ?? defaultNetwork;
  if (!model.networkIds.includes(network)) {
    return fail(`--network '${network}' is not one of ${model.networkIds.join(', ')}`);
  }
  if (accountType !== defaultAccountType && network !== defaultNetwork) {
    return fail(
      `a ${accountType} wallet is seeded on ${defaultNetwork} only; drop --network or use --account-type software`
    );
  }
  return ok(network);
}

interface ResolvedMocks {
  readonly mode: VerifyMocksMode;
  readonly mocks: readonly string[];
}

function resolveMocks(
  model: FeatureMapModel,
  options: VerifyCliOptions,
  feature?: ParsedFeature
): Step<ResolvedMocks> {
  const value = options.mocks?.trim() ?? mocksDefault;
  if (value === mocksNone) return ok({ mode: 'none', mocks: [] });
  const listed = value !== mocksDefault;
  const fromEntry = feature?.preconditions.mocks ?? [];
  const mocks = listed
    ? value
        .split(',')
        .map(mock => mock.trim())
        .filter(mock => mock.length > 0)
    : [...(fromEntry.length > 0 ? fromEntry : defaultMocks)];
  if (listed && mocks.length === 0) {
    return fail(`--mocks needs '${mocksDefault}', '${mocksNone}' or a comma-separated list`);
  }
  const unknown = mocks.filter(mock => !model.mockRegistry.has(mock));
  if (unknown.length > 0) {
    return fail(
      `mock ${unknown.map(mock => `'${mock}'`).join(', ')} is not registered in ${path.basename(model.config.verifyMockRegistryFile)}. Registered: ${[...model.mockRegistry].sort().join(', ')}`
    );
  }
  for (const [first, second] of model.config.exclusiveMocks) {
    if (mocks.includes(first) && mocks.includes(second)) {
      return fail(`mocks '${first}' and '${second}' route the same requests; keep one of them`);
    }
  }
  return ok({ mode: listed ? 'list' : 'default', mocks: [...new Set(mocks)] });
}

function parseFlagList(value: string): Step<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};
  for (const pair of value.split(',')) {
    const trimmed = pair.trim();
    if (trimmed.length === 0) continue;
    const match = /^([A-Za-z0-9_]+)=(true|false)$/.exec(trimmed);
    if (!match?.[1]) {
      return fail(`--flags expects name=true|false pairs separated by commas, got '${trimmed}'`);
    }
    flags[match[1]] = match[2] === 'true';
  }
  return ok(flags);
}

function resolveFlags(
  model: FeatureMapModel,
  options: VerifyCliOptions,
  mocks: ResolvedMocks,
  feature?: ParsedFeature
): Step<Record<string, boolean>> {
  if (mocks.mode === 'none') {
    if (options.flags !== undefined) {
      return fail(
        '--mocks none takes flags from the real LaunchDarkly, so --flags cannot override them'
      );
    }
    return ok({});
  }
  const parsed = options.flags === undefined ? ok({}) : parseFlagList(options.flags);
  if (!parsed.ok) return parsed;
  const unknown = Object.keys(parsed.value).filter(flag => !model.flags.includes(flag));
  if (unknown.length > 0) {
    return fail(
      `--flags: ${unknown.join(', ')} is not a key of ${model.config.featureFlagsInterfaceName}. Known flags: ${model.flags.join(', ')}`
    );
  }
  const fromEntry = Object.fromEntries((feature?.flags ?? []).map(flag => [flag, true]));
  return ok({ ...fromEntry, ...parsed.value });
}

function parseParamsFile(env: VerifyEnvironment, file: string): Step<unknown> {
  const resolved = path.resolve(env.cwd, file);
  try {
    return ok(JSON.parse(env.readParamsFile(resolved)));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return fail(`--params ${file}: cannot read JSON (${reason})`);
  }
}

function catalogEntryFor(model: FeatureMapModel, method: string) {
  const matches = model.rpcCatalog.filter(entry => entry.method === method);
  return matches.find(entry => !entry.buildsParams) ?? matches[0];
}

function resolveRpc(
  model: FeatureMapModel,
  options: VerifyCliOptions,
  env: VerifyEnvironment,
  feature?: ParsedFeature
): Step<VerifyRpc | undefined> {
  const isRpc = options.rpc !== undefined || (feature !== undefined && isRpcEntry(feature));
  if (!isRpc) {
    if (options.params !== undefined) return fail('--params only applies to an rpc run');
    return ok(undefined);
  }
  const requested = options.rpc;
  const catalogId = requested?.startsWith(catalogPrefix)
    ? requested.slice(catalogPrefix.length)
    : undefined;
  if (catalogId !== undefined && !model.rpcCatalog.some(entry => entry.id === catalogId)) {
    return fail(
      `--rpc ${requested}: no test-app catalog entry has id '${catalogId}' in ${path.basename(model.config.rpcCatalogDir)}/`
    );
  }
  const catalogMethod = model.rpcCatalog.find(entry => entry.id === catalogId)?.method;
  const method =
    catalogMethod ??
    (catalogId === undefined ? requested : undefined) ??
    (feature ? entryRpcMethod(feature) : undefined);
  if (method === undefined) {
    return fail(`entry '${feature?.id ?? ''}' has no rpc method; pass --rpc <method>`);
  }
  if (!model.rpcMethods.has(method)) {
    return fail(`--rpc '${method}' is not an RPC method defined in the rpc package`);
  }
  if (options.params !== undefined) {
    const params = parseParamsFile(env, options.params);
    if (!params.ok) return params;
    return ok({ method, catalogId, paramsSource: 'file', params: params.value });
  }
  const fromCatalog = catalogId ?? catalogEntryFor(model, method)?.id;
  if (fromCatalog === undefined) return ok({ method, paramsSource: 'none' });
  return ok({ method, catalogId: fromCatalog, paramsSource: 'catalog' });
}

function resolveTimeout(options: VerifyCliOptions): Step<number> {
  if (options.timeout === undefined) return ok(defaultVerifyTimeoutMs);
  const value = Number(options.timeout);
  if (!Number.isInteger(value) || value <= 0) {
    return fail(`--timeout expects a positive number of milliseconds, got '${options.timeout}'`);
  }
  return ok(value);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function utcStamp(date: Date): string {
  const day = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  const time = `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  return `${day}-${time}`;
}

export function labelSlug(label: string): string {
  return (
    label
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'root'
  );
}

interface Target {
  readonly label: string;
  readonly feature?: ParsedFeature;
  readonly route: string;
}

function resolveTarget(model: FeatureMapModel, options: VerifyCliOptions): Step<Target> {
  if (options.feature !== undefined && options.route !== undefined) {
    return fail('pass either --feature or --route, not both');
  }
  const wanted = options.feature;
  if (wanted !== undefined) {
    const feature = model.features.find(item => item.id === wanted);
    if (!feature) {
      const near = model.features
        .filter(item => item.id.includes(wanted) || wanted.includes(item.id))
        .map(item => item.id)
        .slice(0, 5);
      return fail(
        `no entry with id '${wanted}'.${near.length > 0 ? ` Did you mean ${near.join(', ')}?` : ''} Run pnpm lt feature-map generate and search .claude/skills/feature-map/${model.config.app}.md.`
      );
    }
    if (options.rpc !== undefined || isRpcEntry(feature)) {
      return ok({ label: feature.id, feature, route: rootRoute });
    }
    const route = routeForFeature(feature);
    if (!route.ok) return route;
    return ok({ label: feature.id, feature, route: route.value });
  }
  if (options.route !== undefined) {
    const route = normalizeRoute(model.routeUrls.get(options.route) ?? options.route);
    const feature = findFeatureForRoute(model, options.route);
    if (!feature) {
      return fail(
        `no route entry claims '${options.route}'. Pass a ${model.config.routeUrlsObjectName} key or a path an entry routes, or use --feature.`
      );
    }
    return ok({ label: route, feature, route });
  }
  return fail('pass --feature <id> or --route <path>');
}

export function resolveVerifyRun(
  model: FeatureMapModel,
  options: VerifyCliOptions,
  env: VerifyEnvironment
): ResolveResult {
  const target = resolveTarget(model, options);
  if (!target.ok) return target;
  const { feature, label } = target.value;

  if (feature) {
    const blocked = verifyBlockReason(feature, { ready: options.ready, rpc: options.rpc });
    if (blocked)
      return { ok: false, error: `entry '${feature.id}' cannot be verified: ${blocked}` };
    for (const action of feature.open) {
      const found = model.pageObjectActions.get(action);
      const usable =
        found &&
        model.config.verifyPageObjects.includes(found.className) &&
        !found.isStatic &&
        found.requiredParameters === 0;
      if (!usable) {
        return {
          ok: false,
          error: `entry '${feature.id}': open action '${action}' is not a zero-argument method of a fixture page object; run pnpm lt feature-map check`,
        };
      }
    }
  }

  const session = resolveSession(options, feature);
  if (!session.ok) return session;
  const accountType = resolveAccountType(options, feature);
  if (!accountType.ok) return accountType;
  if (accountType.value === 'ledger' && session.value === 'locked') {
    return { ok: false, error: 'a Ledger wallet has no password, so a locked run is refused' };
  }
  const network = resolveNetwork(model, options, accountType.value, feature);
  if (!network.ok) return network;
  const mocks = resolveMocks(model, options, feature);
  if (!mocks.ok) return mocks;
  const flags = resolveFlags(model, options, mocks.value, feature);
  if (!flags.ok) return flags;
  const rpc = resolveRpc(model, options, env, feature);
  if (!rpc.ok) return rpc;
  if (rpc.value?.paramsSource === 'catalog' && session.value === 'locked') {
    return {
      ok: false,
      error:
        'a catalog rpc run needs an unlocked wallet to build its params; drop --locked or pass --params',
    };
  }
  const slices = parseStateSlices(options.state, model.persistWhitelist);
  if (!slices.ok) return slices;
  const timeout = resolveTimeout(options);
  if (!timeout.ok) return timeout;

  const ready = options.ready ?? feature?.selectors.ready?.value;
  if (ready === undefined) return { ok: false, error: 'pass --ready <testId>' };

  const outDir = options.out
    ? path.resolve(env.cwd, options.out)
    : path.join(model.config.verifyResultsDir, `${labelSlug(label)}-${utcStamp(env.now)}`);

  return {
    ok: true,
    outDir,
    plan: {
      label,
      featureId: feature?.id,
      route: target.value.route,
      open: [...(feature?.open ?? [])],
      session: session.value,
      accountType: accountType.value,
      network: network.value,
      flags: flags.value,
      mocksMode: mocks.value.mode,
      mocks: [...mocks.value.mocks],
      ready,
      rpc: rpc.value,
      stateSlices: [...slices.slices],
      connectTestApp: options.connectTestApp ?? rpc.value !== undefined,
      allowConsoleErrors: options.allowConsoleErrors ?? false,
      timeoutMs: timeout.value,
    },
  };
}
