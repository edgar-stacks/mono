import path from 'node:path';

import { type FeatureSession } from '../feature-map/feature-entry.js';
import { type ParsedFeature } from '../feature-map/features-parser.js';
import { type FeatureMapModel } from '../feature-map/model.js';
import { resolveStateSlices } from './state-evidence.js';
import {
  type VerifyAccountType,
  type VerifyMocks,
  type VerifyRpc,
  type VerifyRun,
  parseFlags,
  verifyAccountTypes,
  verifyDefaultAccountType,
  verifyDefaultNetwork,
  verifyDefaultStateSlices,
  verifyDefaultTimeoutMs,
} from './verify-contract.js';

export interface VerifyOptions {
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
  readonly state?: string;
  readonly connectTestApp?: boolean;
  readonly allowConsoleErrors?: boolean;
  readonly out?: string;
  readonly timeout?: string;
}

export interface ProvidedParams {
  readonly value: unknown;
}

interface ResolveContext {
  readonly now: Date;
  readonly params?: ProvidedParams;
}

interface Failure {
  readonly ok: false;
  readonly error: string;
}

type ResolveResult = { readonly ok: true; readonly run: VerifyRun } | Failure;

type Picked<T> = { readonly ok: true; readonly value: T } | Failure;

const catalogPrefix = 'catalog:';
const defaultMocksOption = 'default';
const noMocksOption = 'none';
const nonSoftwareNetwork = 'mainnet';
const rootPath = '/';
const routeLabelPrefix = 'route';

function usage(error: string): Failure {
  return { ok: false, error };
}

function picked<T>(value: T): Picked<T> {
  return { ok: true, value };
}

function entryMethods(feature: ParsedFeature): string[] {
  return feature.entry.flatMap(point => (point.method === undefined ? [] : [point.method]));
}

function isRpcEntry(feature: ParsedFeature): boolean {
  return feature.anchor.kind === 'rpc' || entryMethods(feature).length > 0;
}

interface BlockerOverrides {
  readonly hasReady?: boolean;
  readonly hasRpc?: boolean;
}

export function verifyBlocker(
  feature: ParsedFeature,
  { hasReady = false, hasRpc = false }: BlockerOverrides = {}
): string | undefined {
  const { anchor } = feature;
  if (anchor.kind === 'behavior') {
    return 'a behavior entry has no screen to open; reproduce it through its specs';
  }
  if (anchor.kind === 'rpc' && entryMethods(feature).length === 0 && !hasRpc) {
    return 'an rpc entry needs an entry point with a method to send';
  }
  if (feature.selectors.ready === undefined && !hasReady) {
    return 'the entry has no selectors.ready to wait for';
  }
  if (hasRpc || isRpcEntry(feature)) return undefined;
  if (anchor.kind === 'selectors' && feature.open.length === 0) {
    return 'a selectors entry needs an open action that reveals it';
  }
  if (!feature.deepLinkable && feature.open.length === 0) {
    return 'the entry is not deep-linkable and has no open action';
  }
  return undefined;
}

const templateSegment = /^\{(.+)\}$/;
const splatSegment = '*';

function segmentParam(segment: string): { name: string; optional: boolean } | undefined {
  if (segment === splatSegment) return { name: splatSegment, optional: false };
  const template = templateSegment.exec(segment);
  if (template?.[1]) return { name: template[1], optional: false };
  if (!segment.startsWith(':')) return undefined;
  const optional = segment.endsWith('?');
  return { name: segment.slice(1).replace(/\?$/, ''), optional };
}

function concretePath(feature: ParsedFeature, value: string): Picked<string> {
  const segments: string[] = [];
  for (const segment of value.split('/')) {
    const param = segmentParam(segment);
    if (!param) {
      segments.push(segment);
      continue;
    }
    const example = feature.params.find(item => item.name === param.name)?.example;
    if (example !== undefined) {
      segments.push(example);
      continue;
    }
    if (param.optional) continue;
    return usage(
      `route '${value}' of entry '${feature.id}' needs an example for param '${param.name}'; add it to params or pass --route with a concrete path`
    );
  }
  return picked(segments.join('/') || rootPath);
}

function routeMatches(pattern: string, concrete: string): boolean {
  const patternSegments = pattern.split('/').filter(Boolean);
  const concreteSegments = concrete.split('/').filter(Boolean);
  let index = 0;
  for (const segment of patternSegments) {
    const param = segmentParam(segment);
    if (param?.name === splatSegment) return index < concreteSegments.length;
    const current = concreteSegments[index];
    if (current === undefined) {
      if (param?.optional) continue;
      return false;
    }
    if (!param && segment !== current) return false;
    index += 1;
  }
  return index === concreteSegments.length;
}

function findByRoute(model: FeatureMapModel, route: string): ParsedFeature[] {
  const absolute = model.features.filter(feature =>
    feature.routes.some(item => item.value.startsWith(rootPath))
  );
  const exact = absolute.filter(feature => feature.routes.some(item => item.value === route));
  if (exact.length > 0) return exact;
  return absolute.filter(feature =>
    feature.routes.some(item => item.value.startsWith(rootPath) && routeMatches(item.value, route))
  );
}

function findByMethod(model: FeatureMapModel, method: string): ParsedFeature[] {
  return model.features.filter(feature => entryMethods(feature).includes(method));
}

function catalogIdForMethod(model: FeatureMapModel, method: string): string | undefined {
  if (model.rpcCatalog.get(method) === method) return method;
  for (const [id, catalogMethod] of model.rpcCatalog) {
    if (catalogMethod === method) return id;
  }
  return undefined;
}

function rpcMethodOption(model: FeatureMapModel, rpc: string): Picked<VerifyRpc> {
  if (rpc.startsWith(catalogPrefix)) {
    const catalogId = rpc.slice(catalogPrefix.length);
    const method = model.rpcCatalog.get(catalogId);
    if (method === undefined) {
      return usage(
        `--rpc ${rpc}: no test-app catalog entry has id '${catalogId}' in ${path.basename(model.config.rpcCatalogDir)}`
      );
    }
    return picked({ method, catalogId, hasParams: false });
  }
  if (!model.rpcMethods.has(rpc)) {
    return usage(`--rpc ${rpc}: not an RPC method defined in the rpc package`);
  }
  return picked({ method: rpc, hasParams: false });
}

function pickFeature(model: FeatureMapModel, options: VerifyOptions): Picked<ParsedFeature> {
  if (options.feature !== undefined && options.route !== undefined) {
    return usage('pass either --feature or --route, not both');
  }
  if (options.feature !== undefined) {
    const feature = model.features.find(item => item.id === options.feature);
    if (!feature) return usage(`no feature-map entry has id '${options.feature}'`);
    return picked(feature);
  }
  if (options.route !== undefined) {
    const [match, ...others] = findByRoute(model, options.route);
    if (!match) return usage(`no feature-map entry routes '${options.route}'`);
    if (others.length > 0) {
      return usage(
        `route '${options.route}' matches several entries (${[match, ...others].map(item => item.id).join(', ')}); pass --feature`
      );
    }
    return picked(match);
  }
  if (options.rpc !== undefined) {
    const rpc = rpcMethodOption(model, options.rpc);
    if (!rpc.ok) return rpc;
    const matches = findByMethod(model, rpc.value.method);
    const [match] = matches;
    if (!match || matches.length > 1) {
      return usage(
        `--rpc ${options.rpc} alone needs exactly one entry with method '${rpc.value.method}', found ${matches.length}; pass --feature`
      );
    }
    return picked(match);
  }
  return usage('pass --feature <id> or --route <path>');
}

function pickSession(feature: ParsedFeature, options: VerifyOptions): Picked<FeatureSession> {
  const chosen: FeatureSession[] = [];
  if (options.signedIn) chosen.push('signed-in');
  if (options.signedOut) chosen.push('signed-out');
  if (options.locked) chosen.push('locked');
  if (chosen.length > 1) return usage('pass only one of --signed-in, --signed-out, --locked');
  return picked(chosen[0] ?? feature.preconditions.session);
}

function pickAccountType(
  feature: ParsedFeature,
  options: VerifyOptions
): Picked<VerifyAccountType> {
  const value =
    options.accountType ?? feature.preconditions.accountType ?? verifyDefaultAccountType;
  const match = verifyAccountTypes.find(type => type === value);
  if (!match) {
    return usage(`account type '${value}' is not one of ${verifyAccountTypes.join(', ')}`);
  }
  return picked(match);
}

function pickMocks(
  feature: ParsedFeature,
  model: FeatureMapModel,
  mocks?: string
): Picked<VerifyMocks> {
  if (mocks === noMocksOption) return picked({ mode: 'none' });
  const names =
    mocks === undefined || mocks === defaultMocksOption
      ? [...feature.preconditions.mocks]
      : mocks
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);
  for (const [first, second] of model.config.exclusiveMocks) {
    if (names.includes(first) && names.includes(second)) {
      return usage(`mocks '${first}' and '${second}' route the same requests; keep one`);
    }
  }
  return picked({ mode: 'list', names });
}

function pickFlags(
  feature: ParsedFeature,
  model: FeatureMapModel,
  mocks: VerifyMocks,
  option?: string
): Picked<Record<string, boolean>> {
  if (mocks.mode === 'none') {
    if (option !== undefined) {
      return usage('--mocks none takes flags from the real LaunchDarkly; drop --flags');
    }
    return picked({});
  }
  const parsed = parseFlags(option);
  if (!parsed.ok) return usage(`--flags: ${parsed.error}`);
  const flags: Record<string, boolean> = {};
  for (const flag of feature.flags) flags[flag] = true;
  Object.assign(flags, parsed.value);
  const unknown = Object.keys(flags).filter(flag => !model.flags.includes(flag));
  if (unknown.length > 0) {
    return usage(`unknown flag${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`);
  }
  return picked(flags);
}

function rpcForRun(
  model: FeatureMapModel,
  feature: ParsedFeature,
  option: string | undefined
): Picked<VerifyRpc> {
  if (option !== undefined) return rpcMethodOption(model, option);
  const [method] = entryMethods(feature);
  if (method === undefined) return usage(`entry '${feature.id}' has no rpc method; pass --rpc`);
  return picked({ method, catalogId: catalogIdForMethod(model, method), hasParams: false });
}

function pickRpc(
  model: FeatureMapModel,
  feature: ParsedFeature,
  options: VerifyOptions,
  params: ProvidedParams | undefined
): Picked<VerifyRpc | undefined> {
  const isRpcRun =
    options.rpc !== undefined || (options.route === undefined && isRpcEntry(feature));
  if (!isRpcRun) {
    if (params) return usage('--params only applies to an rpc run');
    return picked(undefined);
  }
  const rpc = rpcForRun(model, feature, options.rpc);
  if (!rpc.ok) return rpc;
  if (params) return picked({ method: rpc.value.method, params: params.value, hasParams: true });
  return rpc;
}

function pickPath(feature: ParsedFeature, options: VerifyOptions): Picked<string> {
  if (options.route !== undefined) return picked(options.route);
  if (feature.anchor.kind !== 'route' || !feature.deepLinkable) {
    return picked(feature.startRoute?.value ?? rootPath);
  }
  const first = feature.routes.find(route => route.value.startsWith(rootPath));
  if (!first) return usage(`entry '${feature.id}' has no absolute route to open`);
  return concretePath(feature, first.value);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function utcStamp(date: Date): string {
  const day = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  const time = `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  return `${day}-${time}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pickLabel(feature: ParsedFeature, options: VerifyOptions): string {
  if (options.route === undefined) return feature.id;
  const slug = slugify(options.route);
  return slug ? `${routeLabelPrefix}-${slug}` : routeLabelPrefix;
}

function verifyResultsDir(model: FeatureMapModel): string {
  return path.join(model.config.appDir, 'verify-results');
}

function pickTimeout(option?: string): Picked<number> {
  if (option === undefined) return picked(verifyDefaultTimeoutMs);
  const value = Number(option);
  if (!Number.isInteger(value) || value <= 0) {
    return usage(`--timeout '${option}' must be a positive number of milliseconds`);
  }
  return picked(value);
}

function checkCombination(
  run: Pick<VerifyRun, 'accountType' | 'network' | 'session' | 'rpc'>
): string | undefined {
  if (run.accountType !== 'software' && run.network !== nonSoftwareNetwork) {
    return `a ${run.accountType} wallet can only be seeded on ${nonSoftwareNetwork}; drop --network or use --account-type software`;
  }
  if (run.accountType === 'ledger' && run.session === 'locked') {
    return 'a locked Ledger wallet cannot be seeded; Ledger wallets have no password';
  }
  if (run.rpc && !run.rpc.hasParams && run.rpc.catalogId && run.session === 'locked') {
    return 'a catalog rpc run cannot start locked: the catalog builders need an unlocked wallet';
  }
  return undefined;
}

export function resolveVerifyRun(
  model: FeatureMapModel,
  options: VerifyOptions,
  { now, params }: ResolveContext
): ResolveResult {
  const pickedFeature = pickFeature(model, options);
  if (!pickedFeature.ok) return pickedFeature;
  const feature = pickedFeature.value;

  const blocker = verifyBlocker(feature, {
    hasReady: options.ready !== undefined,
    hasRpc: options.rpc !== undefined,
  });
  if (blocker) return usage(`entry '${feature.id}' cannot be verified: ${blocker}`);

  const session = pickSession(feature, options);
  if (!session.ok) return session;
  const accountType = pickAccountType(feature, options);
  if (!accountType.ok) return accountType;

  const network = options.network ?? feature.preconditions.network ?? verifyDefaultNetwork;
  if (model.networkIds.length > 0 && !model.networkIds.includes(network)) {
    return usage(`network '${network}' is not one of ${model.networkIds.join(', ')}`);
  }

  const mocks = pickMocks(feature, model, options.mocks);
  if (!mocks.ok) return mocks;
  const flags = pickFlags(feature, model, mocks.value, options.flags);
  if (!flags.ok) return flags;

  const ready = options.ready ?? feature.selectors.ready?.value;
  if (ready === undefined) {
    return usage(`entry '${feature.id}' has no selectors.ready; pass --ready`);
  }

  const rpc = pickRpc(model, feature, options, params);
  if (!rpc.ok) return rpc;

  const runPath = rpc.value ? picked(rootPath) : pickPath(feature, options);
  if (!runPath.ok) return runPath;

  const state = resolveStateSlices(options.state, model.persistWhitelist, verifyDefaultStateSlices);
  if (state.unknown.length > 0) {
    return usage(
      `--state: ${state.unknown.join(', ')} not persisted; use slices of ${model.persistWhitelist.join(', ')} or all`
    );
  }

  const timeoutMs = pickTimeout(options.timeout);
  if (!timeoutMs.ok) return timeoutMs;

  const combinationError = checkCombination({
    accountType: accountType.value,
    network,
    session: session.value,
    rpc: rpc.value,
  });
  if (combinationError) return usage(combinationError);

  const label = pickLabel(feature, options);
  const outDir = path.resolve(
    options.out ?? path.join(verifyResultsDir(model), `${label}-${utcStamp(now)}`)
  );

  return {
    ok: true,
    run: {
      label,
      featureId: feature.id,
      path: runPath.value,
      open: rpc.value || options.route !== undefined ? [] : [...feature.open],
      session: session.value,
      accountType: accountType.value,
      network,
      flags: flags.value,
      mocks: mocks.value,
      ready,
      rpc: rpc.value,
      stateSlices: [...state.slices],
      connectTestApp: options.connectTestApp ?? rpc.value !== undefined,
      allowConsoleErrors: options.allowConsoleErrors ?? false,
      outDir,
      timeoutMs: timeoutMs.value,
    },
  };
}
