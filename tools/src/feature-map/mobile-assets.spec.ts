import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import {
  collectDispatchedMethods,
  collectHookFlags,
  loadFeatureFlagHooks,
  loadRpcDispatchHandlers,
} from './mobile-assets.js';
import { parseSourceFile } from './ts-ast.js';

const config = getFeatureMapAppConfig('mobile');

describe(collectHookFlags.name, () => {
  test('reads the first string argument of each flag hook call once', () => {
    const sourceFile = parseSourceFile(
      'flags.ts',
      [
        "export function useSwapFlag() { return useBoolVariation('swap', false); }",
        "export function useMinimum() { return useStringVariation('minimum_app_version', ''); }",
        "export function useAgain() { return useBoolVariation('swap', true); }",
        "export function useOther() { return useJsonVariation('ignored', {}); }",
      ].join('\n')
    );
    expect(collectHookFlags(sourceFile, ['useBoolVariation', 'useStringVariation'])).toEqual([
      'swap',
      'minimum_app_version',
    ]);
  });

  test('finds the mobile LaunchDarkly flags', () => {
    const flags = loadFeatureFlagHooks(config);
    expect(flags).toContain('swap');
    expect(flags).toContain('minimum_app_version');
  });
});

describe(collectDispatchedMethods.name, () => {
  test('maps endpoint identifiers used as .method or .request to their method strings', () => {
    const sourceFile = parseSourceFile(
      'dispatch.tsx',
      [
        'switch (props.request?.method) {',
        '  case getAddresses.method: break;',
        '  case stxTransferStx.method: stxTransferStx.request.parse(props.request); break;',
        '}',
        'getInfo.request.safeParse(message);',
        'unknownThing.method;',
      ].join('\n')
    );
    const endpoints = new Map([
      ['getAddresses', 'getAddresses'],
      ['stxTransferStx', 'stx_transferStx'],
      ['getInfo', 'getInfo'],
    ]);
    expect([...collectDispatchedMethods(sourceFile, endpoints)]).toEqual([
      ['getAddresses', 2],
      ['stx_transferStx', 3],
      ['getInfo', 5],
    ]);
  });
});

describe(loadRpcDispatchHandlers.name, () => {
  test('names mobile handlers by method string, approver-less methods included', () => {
    const handlers = loadRpcDispatchHandlers(config);
    expect(handlers.get('getInfo')?.file.endsWith('message-routing.ts')).toBe(true);
    expect(handlers.get('supportedMethods')?.methods).toEqual(['supportedMethods']);
    expect(handlers.get('stx_transferStx')?.file.endsWith('browser-approver.tsx')).toBe(true);
    expect(handlers.has('getAddresses')).toBe(true);
    expect(handlers.size).toBe(15);
  });
});
