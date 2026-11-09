import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from '../feature-map/app-config.js';
import { type ParsedFeature } from '../feature-map/features-parser.js';
import { type FeatureMapModel, buildFeatureMapModel } from '../feature-map/model.js';
import {
  type VerifyOptions,
  resolveVerifyRun,
  slugify,
  utcStamp,
  verifyBlocker,
} from './resolve.js';

const config = getFeatureMapAppConfig('extension');
const extensionModel = buildFeatureMapModel(config);
const now = new Date('2026-11-09T10:15:30Z');

function feature(overrides: Partial<ParsedFeature>): ParsedFeature {
  return {
    file: path.join(config.featuresDir, 'home.features.ts'),
    line: 1,
    group: 'home',
    id: 'sample',
    anchor: { kind: 'route' },
    routes: [{ value: '/sample/:id/:tab?', ref: 'RouteUrls.Sample' }],
    open: [],
    deepLinkable: true,
    params: [{ name: 'id', example: '42' }],
    entry: [{ kind: 'nav', steps: ['Open'] }],
    gate: 'account',
    flags: [],
    preconditions: { session: 'signed-in', mocks: ['setupMockApis', 'mockUnhandledRequests'] },
    selectors: { ready: { value: 'sample-ready', ref: 'SampleSelectors.Ready' }, others: [] },
    actions: [],
    specs: [],
    description: 'Sample.',
    ...overrides,
  };
}

function modelWith(...features: ParsedFeature[]): FeatureMapModel {
  return { ...extensionModel, features };
}

function resolve(options: VerifyOptions, model = extensionModel) {
  return resolveVerifyRun(model, options, { now });
}

function errorOf(options: VerifyOptions, model = extensionModel): string | undefined {
  const result = resolve(options, model);
  return result.ok ? undefined : result.error;
}

describe(resolveVerifyRun.name, () => {
  test('resolves receive-dialog from its entry', () => {
    const result = resolve({ feature: 'receive-dialog' });
    expect(result).toEqual({
      ok: true,
      run: {
        label: 'receive-dialog',
        featureId: 'receive-dialog',
        path: '/',
        open: ['HomePage.goToReceiveDialog'],
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
        outDir: path.join(config.appDir, 'verify-results', 'receive-dialog-20261109-101530'),
        timeoutMs: 30_000,
      },
    });
  });

  test('substitutes param examples, drops unset optional segments and turns entry flags on', () => {
    const sample = feature({
      flags: ['releaseOnramperSell'],
      preconditions: { session: 'signed-in', network: 'testnet4', mocks: [] },
    });
    const result = resolve({ feature: 'sample' }, modelWith(sample));
    expect(result.ok && result.run.path).toBe('/sample/42');
    expect(result.ok && result.run.flags).toEqual({ releaseOnramperSell: true });
    expect(result.ok && result.run.network).toBe('testnet4');
  });

  test('applies overrides', () => {
    const result = resolve({
      feature: 'receive-dialog',
      locked: true,
      network: 'testnet4',
      flags: 'releaseOnramperSell=false',
      mocks: 'setupMockApis',
      ready: 'custom-ready',
      state: 'all',
      allowConsoleErrors: true,
      connectTestApp: true,
      out: '/tmp/verify-out',
      timeout: '5000',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run).toMatchObject({
      session: 'locked',
      network: 'testnet4',
      flags: { releaseOnramperSell: false },
      mocks: { mode: 'list', names: ['setupMockApis'] },
      ready: 'custom-ready',
      stateSlices: extensionModel.persistWhitelist,
      allowConsoleErrors: true,
      connectTestApp: true,
      outDir: '/tmp/verify-out',
      timeoutMs: 5000,
    });
  });

  test('finds the entry that routes a concrete path', () => {
    const result = resolve({ route: '/token/BTC' });
    expect(result.ok && result.run).toMatchObject({
      label: 'route-token-btc',
      featureId: 'token-details',
      path: '/token/BTC',
    });
  });

  test('turns entries with an rpc method into rpc runs with catalog params', () => {
    const result = resolve({ feature: 'rpc-get-addresses' });
    expect(result.ok && result.run).toMatchObject({
      path: '/',
      open: [],
      connectTestApp: true,
      rpc: { method: 'getAddresses', catalogId: 'getAddresses', hasParams: false },
    });
    const withParams = resolveVerifyRun(
      extensionModel,
      { feature: 'rpc-get-addresses', rpc: 'catalog:getAddresses' },
      { now, params: { value: { network: 'mainnet' } } }
    );
    expect(withParams.ok && withParams.run.rpc).toEqual({
      method: 'getAddresses',
      params: { network: 'mainnet' },
      hasParams: true,
    });
  });

  test('reports entries a run cannot open', () => {
    expect(errorOf({ feature: 'wallet-lock' })).toContain('a behavior entry has no screen');
    expect(errorOf({ feature: 'sign-out-sheet' })).toContain(
      'a selectors entry needs an open action'
    );
    expect(errorOf({ feature: 'send-btc-confirmation' })).toContain(
      'not deep-linkable and has no open action'
    );
    expect(errorOf({ feature: 'rpc-supported-methods' })).toContain('no selectors.ready');
    const noMethod = feature({
      id: 'rpc-none',
      anchor: { kind: 'rpc', handlers: ['open'] },
      routes: [],
    });
    expect(errorOf({ feature: 'rpc-none' }, modelWith(noMethod))).toContain(
      'an rpc entry needs an entry point with a method'
    );
    const noReady = feature({ selectors: { others: [] } });
    expect(errorOf({ feature: 'sample' }, modelWith(noReady))).toContain('no selectors.ready');
    expect(resolve({ feature: 'sample', ready: 'x' }, modelWith(noReady)).ok).toBe(true);
  });

  test('reports usage errors', () => {
    expect(errorOf({})).toBe('pass --feature <id> or --route <path>');
    expect(errorOf({ feature: 'nope' })).toBe("no feature-map entry has id 'nope'");
    expect(errorOf({ feature: 'receive-dialog', route: '/' })).toContain('not both');
    expect(errorOf({ feature: 'receive-dialog', signedIn: true, locked: true })).toContain(
      'only one of'
    );
    expect(errorOf({ feature: 'receive-dialog', accountType: 'paper' })).toContain(
      "account type 'paper'"
    );
    expect(errorOf({ feature: 'receive-dialog', network: 'moon' })).toContain(
      "network 'moon' is not one of"
    );
    expect(errorOf({ feature: 'receive-dialog', mocks: 'none', flags: 'a=true' })).toContain(
      '--mocks none takes flags from the real LaunchDarkly'
    );
    expect(errorOf({ feature: 'receive-dialog', flags: 'nopeFlag=true' })).toBe(
      'unknown flag: nopeFlag'
    );
    expect(
      errorOf({
        feature: 'receive-dialog',
        mocks: 'mockMixedUtxosForSend,mockNativeSegwitOnlyUtxosForSend',
      })
    ).toContain('route the same requests');
    expect(errorOf({ feature: 'receive-dialog', state: 'active,cache' })).toContain(
      '--state: cache not persisted'
    );
    expect(errorOf({ feature: 'receive-dialog', timeout: '0' })).toContain('--timeout');
    expect(errorOf({ feature: 'receive-dialog', rpc: 'catalog:nope' })).toContain(
      "no test-app catalog entry has id 'nope'"
    );
    expect(errorOf({ feature: 'receive-dialog', rpc: 'notAMethod' })).toContain(
      'not an RPC method'
    );
    const needsParam = feature({ params: [] });
    expect(errorOf({ feature: 'sample' }, modelWith(needsParam))).toContain(
      "needs an example for param 'id'"
    );
  });

  test('takes flags from the real LaunchDarkly without mocks', () => {
    const result = resolve({ feature: 'fund', mocks: 'none' });
    expect(result.ok && result.run).toMatchObject({ mocks: { mode: 'none' }, flags: {} });
  });

  test('keeps non-software wallets on mainnet and refuses impossible sessions', () => {
    expect(
      errorOf({ feature: 'receive-dialog', accountType: 'ledger', network: 'testnet4' })
    ).toContain('a ledger wallet can only be seeded on mainnet');
    expect(errorOf({ feature: 'receive-dialog', accountType: 'ledger', locked: true })).toContain(
      'a locked Ledger wallet cannot be seeded'
    );
    expect(errorOf({ feature: 'rpc-get-addresses', locked: true })).toContain(
      'a catalog rpc run cannot start locked'
    );
    expect(resolve({ feature: 'receive-dialog', accountType: 'mixed', locked: true }).ok).toBe(
      true
    );
  });
});

describe(verifyBlocker.name, () => {
  test('lets an rpc override unblock an rpc entry with no method', () => {
    const noMethod = feature({ anchor: { kind: 'rpc', handlers: ['open'] }, routes: [] });
    expect(verifyBlocker(noMethod)).toBeDefined();
    expect(verifyBlocker(noMethod, { hasRpc: true })).toBeUndefined();
  });
});

describe(utcStamp.name, () => {
  test('formats UTC as YYYYMMDD-HHMMSS', () => {
    expect(utcStamp(new Date('2026-01-02T03:04:05Z'))).toBe('20260102-030405');
  });
});

describe(slugify.name, () => {
  test('keeps lowercase letters, digits and single hyphens', () => {
    expect(slugify('/swap/stacks/STX')).toBe('swap-stacks-stx');
    expect(slugify('/')).toBe('');
  });
});
