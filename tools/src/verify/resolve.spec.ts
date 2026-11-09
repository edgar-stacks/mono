import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from '../feature-map/app-config.js';
import { type ParsedFeature } from '../feature-map/features-parser.js';
import { type FeatureMapModel, buildFeatureMapModel } from '../feature-map/model.js';
import {
  type VerifyCliOptions,
  resolveVerifyRun,
  routeSlug,
  utcStamp,
  verifyBlocker,
} from './resolve.js';

const config = getFeatureMapAppConfig('extension');
const realModel = buildFeatureMapModel(config);
const resultsDir = path.join(config.appDir, 'verify-results');
const now = new Date(Date.UTC(2026, 10, 9, 7, 5, 3));

function featureById(id: string): ParsedFeature {
  const feature = realModel.features.find(item => item.id === id);
  if (!feature) throw new Error(`no feature ${id}`);
  return feature;
}

function resolve(options: VerifyCliOptions, model: FeatureMapModel = realModel) {
  return resolveVerifyRun(options, {
    model,
    now,
    resultsDir,
    cwd: '/work',
    readParams(file) {
      return { file };
    },
  });
}

function withFeature(feature: ParsedFeature): FeatureMapModel {
  return { ...realModel, features: [...realModel.features, feature] };
}

function errorsOf(options: VerifyCliOptions, model?: FeatureMapModel): readonly string[] {
  return resolve(options, model).errors ?? [];
}

describe(resolveVerifyRun.name, () => {
  test('resolves receive-dialog from its entry', () => {
    const { run, errors } = resolve({ feature: 'receive-dialog' });
    expect(errors).toBeUndefined();
    expect(run).toEqual({
      label: 'receive-dialog',
      feature: 'receive-dialog',
      route: '/',
      open: [{ className: 'HomePage', method: 'goToReceiveDialog' }],
      session: 'signed-in',
      accountType: 'software',
      network: 'mainnet',
      flags: {},
      mocks: { mode: 'list', names: ['setupMockApis', 'mockUnhandledRequests'] },
      ready: 'receive-assets-tab',
      rpc: undefined,
      stateSlices: ['active', 'networks', 'wallets'],
      connectTestApp: false,
      allowConsoleErrors: false,
      outDir: path.join(resultsDir, 'receive-dialog-20261109-070503'),
      timeout: 30000,
    });
  });

  test('applies option overrides', () => {
    const flag = realModel.flags[0] ?? '';
    const { run } = resolve({
      feature: 'receive-dialog',
      locked: true,
      network: 'testnet4',
      flags: `${flag}=false`,
      mocks: 'setupMockApis',
      ready: 'other-test-id',
      state: 'all',
      allowConsoleErrors: true,
      connectTestApp: true,
      out: 'evidence',
      timeout: '5000',
    });
    expect(run).toMatchObject({
      session: 'locked',
      network: 'testnet4',
      flags: { [flag]: false },
      mocks: { mode: 'list', names: ['setupMockApis'] },
      ready: 'other-test-id',
      stateSlices: realModel.persistWhitelist,
      allowConsoleErrors: true,
      connectTestApp: true,
      outDir: '/work/evidence',
      timeout: 5000,
    });
  });

  test('turns on the entry flags and lets --flags override them', () => {
    const flag = realModel.flags[0] ?? '';
    const flagged = { ...featureById('receive-dialog'), id: 'flagged-receive', flags: [flag] };
    const model = withFeature(flagged);
    expect(resolve({ feature: 'flagged-receive' }, model).run?.flags).toEqual({ [flag]: true });
    expect(
      resolve({ feature: 'flagged-receive', flags: `${flag}=false` }, model).run?.flags
    ).toEqual({ [flag]: false });
  });

  test('--mocks none reads real flags and rejects --flags', () => {
    expect(resolve({ feature: 'receive-dialog', mocks: 'none' }).run).toMatchObject({
      mocks: { mode: 'none' },
      flags: {},
    });
    const flag = realModel.flags[0] ?? '';
    expect(errorsOf({ feature: 'receive-dialog', mocks: 'none', flags: `${flag}=true` })).toEqual([
      '--mocks none reads flags from the real LaunchDarkly, so --flags cannot apply',
    ]);
  });

  test('reports usage errors for bad options', () => {
    expect(errorsOf({})).toEqual(['pass --feature <id> or --route <path>']);
    expect(errorsOf({ feature: 'receive-dialog', route: '/' })).toEqual([
      'pass --feature or --route, not both',
    ]);
    expect(errorsOf({ feature: 'nope' })[0]).toContain("no feature-map entry has id 'nope'");
    expect(
      errorsOf({
        feature: 'receive-dialog',
        signedIn: true,
        locked: true,
        accountType: 'paper',
        network: 'moonnet',
        flags: 'releaseNothing=true,broken',
        mocks: 'mockNothing',
        state: 'secrets',
        timeout: '-1',
      })
    ).toEqual([
      'choose one of --signed-in, --signed-out and --locked, not signed-in and locked',
      '--account-type must be one of software, ledger, mixed, policy',
      expect.stringContaining("--network 'moonnet' is not a network id"),
      "--mocks: 'mockNothing' is not exported from mocks; use default, none or mock function names",
      expect.stringContaining("--flags: 'releaseNothing' is not a feature flag"),
      "--flags: 'broken' must look like name=true or name=false",
      expect.stringContaining('--state: secrets is not persisted'),
      '--timeout must be a positive number of milliseconds',
    ]);
  });

  test('keeps non-software wallets on mainnet and refuses a locked Ledger wallet', () => {
    expect(
      errorsOf({ feature: 'receive-dialog', accountType: 'ledger', network: 'testnet4' })
    ).toEqual([
      'a ledger wallet is seeded on mainnet only; drop --network or use --account-type software',
    ]);
    expect(errorsOf({ feature: 'receive-dialog', accountType: 'ledger', locked: true })).toEqual([
      'a Ledger wallet has no password to lock; drop --locked or use another account type',
    ]);
    expect(
      resolve({ feature: 'receive-dialog', accountType: 'mixed', locked: true }).run
    ).toMatchObject({ accountType: 'mixed', session: 'locked' });
  });

  test('refuses entries a run cannot open and says why', () => {
    expect(errorsOf({ feature: 'ledger-flow' })).toEqual([
      "entry 'ledger-flow' cannot be verified: a behavior entry has no screen to open; reproduce it through its specs",
    ]);
    expect(errorsOf({ feature: 'update-available-callout' })).toEqual([
      "entry 'update-available-callout' cannot be verified: a selectors entry needs an open action that reveals it; none is listed",
    ]);
    expect(errorsOf({ feature: 'send-btc-choose-fee' })).toEqual([
      "entry 'send-btc-choose-fee' cannot be verified: the screen is not deep-linkable and no open action reaches it",
    ]);
    expect(errorsOf({ feature: 'rpc-supported-methods' })).toEqual([
      "entry 'rpc-supported-methods' cannot be verified: the entry has no selectors.ready, so a run has nothing to wait for",
    ]);
    const silentRpc = {
      ...featureById('rpc-open'),
      id: 'rpc-silent',
      entry: [{ kind: 'rpc', steps: [] }],
    } satisfies ParsedFeature;
    expect(errorsOf({ feature: 'rpc-silent' }, withFeature(silentRpc))).toEqual([
      "entry 'rpc-silent' cannot be verified: the rpc entry names no method in its entry points",
    ]);
  });

  test('lets --ready stand in for a missing selectors.ready', () => {
    const { run } = resolve({ feature: 'rpc-supported-methods', ready: 'x' });
    expect(run?.ready).toBe('x');
  });

  test('resolves an rpc entry from its method and the test-app catalog', () => {
    expect(resolve({ feature: 'rpc-open' }).run).toMatchObject({
      rpc: { method: 'open', catalogId: 'open-popup', paramsSource: 'catalog' },
      connectTestApp: true,
    });
    expect(resolve({ feature: 'rpc-open', rpc: 'catalog:signMessage-p2tr' }).run?.rpc).toEqual({
      method: 'signMessage',
      catalogId: 'signMessage-p2tr',
      paramsSource: 'catalog',
    });
    expect(resolve({ feature: 'rpc-open', params: 'params.json' }).run?.rpc).toEqual({
      method: 'open',
      params: { file: '/work/params.json' },
      paramsSource: 'file',
    });
    expect(resolve({ feature: 'rpc-open', connectTestApp: false }).run?.connectTestApp).toBe(false);
  });

  test('reports rpc usage errors', () => {
    expect(errorsOf({ feature: 'rpc-open', rpc: 'catalog:nope' })[0]).toContain(
      "--rpc: 'nope' is not a test-app catalog id"
    );
    expect(errorsOf({ feature: 'rpc-open', rpc: 'teleport' })).toEqual([
      "--rpc: 'teleport' is not an RPC method defined in packages/rpc",
    ]);
    expect(errorsOf({ feature: 'receive-dialog', params: 'params.json' })).toEqual([
      '--params needs an rpc run (--rpc or an rpc entry)',
    ]);
    expect(errorsOf({ feature: 'rpc-open', locked: true })).toEqual([
      'catalog rpc runs build their params from the unlocked wallet; drop --locked or pass --params',
    ]);
    expect(resolve({ feature: 'rpc-open', locked: true, params: 'p.json' }).run?.session).toBe(
      'locked'
    );
  });

  test('resolves a route from the entry that claims it', () => {
    expect(resolve({ route: '/activity' }).run).toMatchObject({
      label: 'route-activity',
      feature: 'home-activity',
      route: '/activity',
      ready: 'activity-list',
      outDir: path.join(resultsDir, 'route-activity-20261109-070503'),
    });
  });

  test('needs --ready for a route no entry claims', () => {
    expect(errorsOf({ route: '/nowhere' })).toEqual(['nothing to wait for: pass --ready <testId>']);
    expect(resolve({ route: '/nowhere', ready: 'x' }).run).toMatchObject({
      feature: undefined,
      route: '/nowhere',
      mocks: { mode: 'list', names: ['setupMockApis', 'mockUnhandledRequests'] },
    });
    expect(errorsOf({ route: 'nowhere', ready: 'x' })).toEqual([
      "--route 'nowhere' must start with /",
    ]);
  });

  test('substitutes params and rejects routes that keep a placeholder', () => {
    const withParam = {
      ...featureById('home-activity'),
      id: 'param-route',
      routes: [{ value: '/token/:id', ref: 'RouteUrls.Nope' }],
      params: [{ name: 'id', example: 'stx' }],
    } satisfies ParsedFeature;
    expect(resolve({ feature: 'param-route' }, withFeature(withParam)).run?.route).toBe(
      '/token/stx'
    );
    const noExample = { ...withParam, id: 'no-example', params: [] } satisfies ParsedFeature;
    expect(errorsOf({ feature: 'no-example' }, withFeature(noExample))).toEqual([
      "route '/token/:id' still has :id; add params examples to the entry or pass a concrete --route",
    ]);
  });
});

describe(verifyBlocker.name, () => {
  test('is undefined for an entry a run can open', () => {
    expect(verifyBlocker(featureById('receive-dialog'))).toBeUndefined();
    expect(verifyBlocker(featureById('home-tokens'))).toBeUndefined();
  });
});

describe(utcStamp.name, () => {
  test('formats UTC as YYYYMMDD-HHMMSS', () => {
    expect(utcStamp(now)).toBe('20261109-070503');
  });
});

describe(routeSlug.name, () => {
  test('turns a route into a directory-safe label', () => {
    expect(routeSlug('/send/btc')).toBe('route-send-btc');
    expect(routeSlug('/')).toBe('route-home');
    expect(routeSlug('/swap/:base?')).toBe('route-swap-base');
  });
});
