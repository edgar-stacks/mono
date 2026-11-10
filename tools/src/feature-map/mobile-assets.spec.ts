import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig, toRepoRelative } from './app-config.js';
import {
  collectEndpointReferences,
  collectHookFlagNames,
  loadFlagHookNames,
  loadRpcDispatchHandlers,
} from './mobile-assets.js';
import { parseSourceFile } from './ts-ast.js';

const config = getFeatureMapAppConfig('mobile');

describe(collectHookFlagNames.name, () => {
  test('reads the first string argument of each flag hook call once', () => {
    const source = parseSourceFile(
      'flags.ts',
      [
        "export function useA() { return useBoolVariation('a_flag', false); }",
        "export function useB() { return useStringVariation('b_flag', ''); }",
        "export function useA2() { return useBoolVariation('a_flag', true); }",
        "export function useC() { return useOtherVariation('c_flag', false); }",
        'export function useD(name: string) { return useBoolVariation(name, false); }',
      ].join('\n')
    );
    expect(collectHookFlagNames(source, ['useBoolVariation', 'useStringVariation'])).toEqual([
      'a_flag',
      'b_flag',
    ]);
  });
});

describe(loadFlagHookNames.name, () => {
  test('reads the mobile LaunchDarkly flags', () => {
    const flags = loadFlagHookNames(config);
    expect(flags).toContain('swap');
    expect(flags).toContain('minimum_app_version');
  });
});

describe(collectEndpointReferences.name, () => {
  test('records the first line each endpoint is dispatched on through .method or .request', () => {
    const source = parseSourceFile(
      'dispatch.tsx',
      [
        'switch (request.method) {',
        '  case getAddresses.method:',
        '    break;',
        '}',
        'const parsed = getInfo.request.safeParse(message);',
        'const other = notAnEndpoint.method;',
        'const name = getAddresses.method;',
        'type Info = typeof getInfo;',
      ].join('\n')
    );
    const references = collectEndpointReferences(source, new Set(['getAddresses', 'getInfo']));
    expect([...references]).toEqual([
      ['getAddresses', 2],
      ['getInfo', 5],
    ]);
  });
});

describe(loadRpcDispatchHandlers.name, () => {
  test('keys the mobile dApp methods by method string with the file that dispatches them', () => {
    const handlers = loadRpcDispatchHandlers(config);
    const getInfo = handlers.get('getInfo');
    expect(getInfo && toRepoRelative(getInfo.file)).toBe(
      'apps/mobile/src/features/browser/browser/message-routing.ts'
    );
    expect(handlers.get('supportedMethods')?.methods).toEqual(['supportedMethods']);
    const callContract = handlers.get('stx_callContract');
    expect(callContract && toRepoRelative(callContract.file)).toBe(
      'apps/mobile/src/features/browser/approver-sheet/browser-approver.tsx'
    );
    expect(handlers.has('getAddresses')).toBe(true);
    expect(handlers.has('open')).toBe(false);
  });

  test('is empty without dispatch files', () => {
    expect(loadRpcDispatchHandlers({ ...config, rpcDispatchFiles: undefined }).size).toBe(0);
  });
});
