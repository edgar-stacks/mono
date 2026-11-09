import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import { collectDispatchedMethods, loadRpcDispatchHandlers } from './mobile-assets.js';
import { loadFeatureFlags } from './test-assets.js';
import { collectCallFirstStrings, parseSourceFile } from './ts-ast.js';

const config = getFeatureMapAppConfig('mobile');

describe(collectDispatchedMethods.name, () => {
  test('resolves case x.method and x.request references to method strings', () => {
    const sourceFile = parseSourceFile(
      'dispatch.tsx',
      `
      switch (request.method) {
        case signPsbt.method:
          return null;
      }
      const parsed = getInfo.request.safeParse(message);
      const other = unrelated.method;
      `
    );
    const methods = collectDispatchedMethods(
      sourceFile,
      new Map([
        ['signPsbt', 'signPsbt'],
        ['getInfo', 'getInfo'],
      ])
    );
    expect([...methods.keys()]).toEqual(['signPsbt', 'getInfo']);
  });
});

describe(loadRpcDispatchHandlers.name, () => {
  test('names each handler by the method string the mobile browser dispatches', () => {
    if (!config.rpcDispatchFiles) throw new Error('mobile config has no rpc dispatch files');
    const handlers = loadRpcDispatchHandlers(config.rpcDispatchFiles, config.rpcEndpointsDir);
    expect(handlers.get('getInfo')?.file.endsWith('message-routing.ts')).toBe(true);
    expect(handlers.get('supportedMethods')?.methods).toEqual(['supportedMethods']);
    expect(handlers.get('stx_callContract')?.file.endsWith('browser-approver.tsx')).toBe(true);
    expect(handlers.has('getAddresses')).toBe(true);
    expect([...handlers.values()].every(handler => handler.methods[0] === handler.name)).toBe(true);
  });
});

describe(collectCallFirstStrings.name, () => {
  test('collects the first string argument of the named calls once each', () => {
    const sourceFile = parseSourceFile(
      'flags.ts',
      `
      useBoolVariation('swap', false);
      useStringVariation('minimum_app_version', '');
      useBoolVariation('swap', false);
      useOther('ignored');
      useBoolVariation(dynamicKey, false);
      `
    );
    expect(collectCallFirstStrings(sourceFile, ['useBoolVariation', 'useStringVariation'])).toEqual(
      ['swap', 'minimum_app_version']
    );
  });

  test('loads the mobile LaunchDarkly flags from the hooks', () => {
    const flags = loadFeatureFlags(config);
    expect(flags).toContain('swap');
    expect(flags).toContain('minimum_app_version');
  });
});
