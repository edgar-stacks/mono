import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from '../feature-map/app-config.js';
import { type ParsedFeature } from '../feature-map/features-parser.js';
import { buildFeatureMapModel } from '../feature-map/model.js';
import {
  type VerifyCliOptions,
  labelSlug,
  resolveVerifyRun,
  utcStamp,
  verifyBlockReason,
  verifyCommand,
} from './resolve.js';

const config = getFeatureMapAppConfig('extension');
const model = buildFeatureMapModel(config);
const now = new Date('2026-11-09T07:41:17Z');
const cwd = '/work/mono';
const paramsFiles = new Map([[path.resolve(cwd, 'params.json'), '{"network":"mainnet"}']]);

const env = {
  cwd,
  now,
  readParamsFile(file: string) {
    const text = paramsFiles.get(file);
    if (text === undefined) throw new Error(`ENOENT: ${file}`);
    return text;
  },
};

function resolve(options: VerifyCliOptions) {
  return resolveVerifyRun(model, options, env);
}

function planOf(options: VerifyCliOptions) {
  const result = resolve(options);
  if (!result.ok) throw new Error(result.error);
  return result;
}

function errorOf(options: VerifyCliOptions) {
  const result = resolve(options);
  if (result.ok) throw new Error(`expected a usage error for ${JSON.stringify(options)}`);
  return result.error;
}

function featureById(id: string): ParsedFeature {
  const found = model.features.find(feature => feature.id === id);
  if (!found) throw new Error(`no feature ${id}`);
  return found;
}

function synthetic(overrides: Partial<ParsedFeature>): ParsedFeature {
  return { ...featureById('home-tokens'), id: 'synthetic', ...overrides };
}

function withFeature(feature: ParsedFeature) {
  return { ...model, features: [...model.features, feature] };
}

describe(resolveVerifyRun.name, () => {
  test('resolves a selectors entry from its start route, open action and ready selector', () => {
    const receive = featureById('receive-dialog');
    const { plan, outDir } = planOf({ feature: 'receive-dialog' });
    expect(plan).toEqual({
      label: 'receive-dialog',
      featureId: 'receive-dialog',
      route: '/',
      open: ['HomePage.goToReceiveDialog'],
      session: 'signed-in',
      accountType: 'software',
      network: 'mainnet',
      flags: {},
      mocksMode: 'default',
      mocks: ['setupMockApis', 'mockUnhandledRequests'],
      ready: receive.selectors.ready?.value,
      rpc: undefined,
      stateSlices: ['active', 'networks', 'wallets'],
      connectTestApp: false,
      allowConsoleErrors: false,
      timeoutMs: 30000,
    });
    expect(outDir).toBe(
      path.join(config.appDir, 'verify-results', 'receive-dialog-20261109-074117')
    );
  });

  test('substitutes params examples into the route and drops unfilled optional segments', () => {
    expect(planOf({ feature: 'token-details' }).plan.route).toBe('/token/BTC');
    const swap = synthetic({
      routes: [{ value: '/swap/{chain}/:base/:quote?', ref: 'RouteUrls.Swap' }],
      params: [
        { name: 'chain', example: 'stacks' },
        { name: 'base', example: 'STX' },
      ],
    });
    const result = resolveVerifyRun(withFeature(swap), { feature: 'synthetic' }, env);
    expect(result.ok && result.plan.route).toBe('/swap/stacks/STX');
    const missing = synthetic({ routes: [{ value: '/send/:symbol' }], params: [] });
    const error = resolveVerifyRun(withFeature(missing), { feature: 'synthetic' }, env);
    expect(error.ok ? '' : error.error).toContain('needs a params example for :symbol');
  });

  test('applies option overrides', () => {
    const { plan, outDir } = planOf({
      feature: 'home-tokens',
      locked: true,
      network: 'testnet4',
      flags: 'releaseOnramperSell=false',
      mocks: 'setupMockApis,mockUnhandledRequests,mockMixedUtxosForSend',
      ready: 'custom-ready',
      state: 'all',
      connectTestApp: true,
      allowConsoleErrors: true,
      out: 'results/run',
      timeout: '5000',
    });
    expect(plan).toMatchObject({
      session: 'locked',
      network: 'testnet4',
      flags: { releaseOnramperSell: false },
      mocksMode: 'list',
      mocks: ['setupMockApis', 'mockUnhandledRequests', 'mockMixedUtxosForSend'],
      ready: 'custom-ready',
      stateSlices: model.persistWhitelist,
      connectTestApp: true,
      allowConsoleErrors: true,
      timeoutMs: 5000,
    });
    expect(outDir).toBe(path.resolve(cwd, 'results/run'));
  });

  test('turns on the flags an entry lists', () => {
    const sell = featureById('sell');
    const { plan } = planOf({ feature: 'sell' });
    expect(plan.flags).toEqual(Object.fromEntries(sell.flags.map(flag => [flag, true])));
  });

  test('finds the entry for --route by key, path or params pattern', () => {
    expect(planOf({ route: 'Home' }).plan).toMatchObject({ featureId: 'home-tokens', route: '/' });
    expect(planOf({ route: '/settings' }).plan).toMatchObject({
      featureId: 'settings',
      label: '/settings',
    });
    expect(planOf({ route: '#/token/STX' }).plan).toMatchObject({
      featureId: 'token-details',
      route: '/token/STX',
    });
    expect(errorOf({ route: '/nowhere' })).toContain("no route entry claims '/nowhere'");
  });

  test('builds an rpc run from the entry method and the test-app catalog', () => {
    const { plan } = planOf({ feature: 'rpc-get-addresses' });
    expect(plan).toMatchObject({
      route: '/',
      connectTestApp: true,
      rpc: { method: 'getAddresses', catalogId: 'getAddresses', paramsSource: 'catalog' },
    });
    expect(planOf({ feature: 'rpc-open', rpc: 'catalog:open-popup' }).plan.rpc).toEqual({
      method: 'open',
      catalogId: 'open-popup',
      paramsSource: 'catalog',
    });
    expect(
      planOf({ feature: 'rpc-get-addresses', params: 'params.json', locked: true }).plan.rpc
    ).toEqual({
      method: 'getAddresses',
      catalogId: undefined,
      paramsSource: 'file',
      params: { network: 'mainnet' },
    });
    expect(
      planOf({ feature: 'home-tokens', rpc: 'getAddresses', connectTestApp: false }).plan
    ).toMatchObject({ connectTestApp: false, rpc: { method: 'getAddresses' } });
  });

  test('rejects rpc runs a test app cannot send', () => {
    expect(errorOf({ feature: 'rpc-get-addresses', locked: true })).toContain(
      'a catalog rpc run needs an unlocked wallet'
    );
    expect(errorOf({ feature: 'rpc-get-addresses', rpc: 'catalog:nope' })).toContain(
      "no test-app catalog entry has id 'nope'"
    );
    expect(errorOf({ feature: 'rpc-get-addresses', rpc: 'teleport' })).toContain(
      "--rpc 'teleport' is not an RPC method"
    );
    expect(errorOf({ feature: 'rpc-get-addresses', params: 'missing.json' })).toContain(
      '--params missing.json: cannot read JSON'
    );
    expect(errorOf({ feature: 'home-tokens', params: 'params.json' })).toBe(
      '--params only applies to an rpc run'
    );
  });

  test('refuses account types, networks and sessions a run cannot seed', () => {
    expect(errorOf({ feature: 'home-tokens', accountType: 'ledger', locked: true })).toBe(
      'a Ledger wallet has no password, so a locked run is refused'
    );
    expect(errorOf({ feature: 'home-tokens', accountType: 'mixed', network: 'testnet4' })).toBe(
      'a mixed wallet is seeded on mainnet only; drop --network or use --account-type software'
    );
    expect(errorOf({ feature: 'home-tokens', accountType: 'hardware' })).toContain(
      "--account-type 'hardware' is not one of software, ledger, mixed, policy"
    );
    expect(errorOf({ feature: 'home-tokens', network: 'moon' })).toContain(
      "--network 'moon' is not one of"
    );
    expect(errorOf({ feature: 'home-tokens', signedIn: true, signedOut: true })).toBe(
      'pass at most one of --signed-in, --signed-out and --locked'
    );
  });

  test('validates mocks and flags', () => {
    expect(planOf({ feature: 'home-tokens', mocks: 'none' }).plan).toMatchObject({
      mocksMode: 'none',
      mocks: [],
      flags: {},
    });
    expect(
      errorOf({ feature: 'home-tokens', mocks: 'none', flags: 'releaseOnramperSell=true' })
    ).toBe('--mocks none takes flags from the real LaunchDarkly, so --flags cannot override them');
    expect(errorOf({ feature: 'home-tokens', mocks: 'mockNothing' })).toContain(
      "mock 'mockNothing' is not registered in mock-registry.ts"
    );
    expect(
      errorOf({
        feature: 'home-tokens',
        mocks: 'mockMixedUtxosForSend,mockNativeSegwitOnlyUtxosForSend',
      })
    ).toBe(
      "mocks 'mockMixedUtxosForSend' and 'mockNativeSegwitOnlyUtxosForSend' route the same requests; keep one of them"
    );
    expect(errorOf({ feature: 'home-tokens', flags: 'releaseOnramperSell' })).toContain(
      "--flags expects name=true|false pairs separated by commas, got 'releaseOnramperSell'"
    );
    expect(errorOf({ feature: 'home-tokens', flags: 'releaseTeleport=true' })).toContain(
      '--flags: releaseTeleport is not a key of FeatureFlags'
    );
  });

  test('validates the target, state slices and timeout', () => {
    expect(errorOf({})).toBe('pass --feature <id> or --route <path>');
    expect(errorOf({ feature: 'home-tokens', route: '/' })).toBe(
      'pass either --feature or --route, not both'
    );
    expect(errorOf({ feature: 'receive' })).toContain('Did you mean receive-dialog');
    expect(errorOf({ feature: 'home-tokens', state: 'keys' })).toContain(
      '--state: keys is not a persisted slice'
    );
    expect(errorOf({ feature: 'home-tokens', timeout: '0' })).toBe(
      "--timeout expects a positive number of milliseconds, got '0'"
    );
  });

  test('refuses entries a run cannot open', () => {
    expect(errorOf({ feature: 'ledger-flow' })).toBe(
      "entry 'ledger-flow' cannot be verified: a behavior entry has no screen to open; reproduce it through its specs"
    );
    expect(errorOf({ feature: 'rpc-supported-methods' })).toBe(
      "entry 'rpc-supported-methods' cannot be verified: it has no selectors.ready, so a run has nothing to wait for"
    );
  });
});

describe(verifyBlockReason.name, () => {
  const ready = { value: 'ready', ref: 'HomePageSelectors.Ready' };

  test('names why an entry cannot be opened', () => {
    expect(verifyBlockReason(synthetic({ anchor: { kind: 'behavior' } }))).toContain(
      'behavior entry'
    );
    expect(verifyBlockReason(synthetic({ selectors: { others: [] } }))).toContain(
      'no selectors.ready'
    );
    expect(
      verifyBlockReason(synthetic({ anchor: { kind: 'selectors', objects: [] }, routes: [] }))
    ).toBe('a selectors entry needs an open action and no page-object action reveals it');
    expect(verifyBlockReason(synthetic({ deepLinkable: false }))).toBe(
      'it is not deep-linkable and no open action reaches it'
    );
    expect(
      verifyBlockReason(
        synthetic({
          anchor: { kind: 'rpc', handlers: ['open'] },
          routes: [],
          entry: [{ kind: 'rpc', steps: ['Call'] }],
          selectors: { ready, others: [] },
        })
      )
    ).toBe('an rpc entry needs an entry point with a method to send');
  });

  test('lets --ready and --rpc fill the gaps they cover', () => {
    expect(verifyBlockReason(synthetic({ selectors: { others: [] } }), { ready: 'x' })).toBe(
      undefined
    );
    expect(
      verifyBlockReason(synthetic({ deepLinkable: false, open: ['HomePage.lock'] }))
    ).toBeUndefined();
    expect(verifyBlockReason(synthetic({ deepLinkable: false }), { rpc: 'open' })).toBeUndefined();
  });

  test('every screen entry either verifies or names its reason', () => {
    for (const feature of model.features) {
      const reason = verifyBlockReason(feature);
      if (reason === undefined) {
        expect(resolve({ feature: feature.id }).ok, feature.id).toBe(true);
      } else {
        expect(errorOf({ feature: feature.id })).toContain(reason);
      }
    }
  });
});

describe(verifyCommand.name, () => {
  test('prints the command that opens an entry', () => {
    expect(verifyCommand(model, featureById('receive-dialog'))).toBe(
      'pnpm lt verify extension --feature receive-dialog'
    );
  });
});

describe('artifact directory naming', () => {
  test('stamps UTC time and slugs the label', () => {
    expect(utcStamp(new Date('2026-01-02T03:04:05Z'))).toBe('20260102-030405');
    expect(labelSlug('/token/:chain/*')).toBe('token-chain');
    expect(labelSlug('/')).toBe('root');
    expect(labelSlug('receive-dialog')).toBe('receive-dialog');
  });
});
