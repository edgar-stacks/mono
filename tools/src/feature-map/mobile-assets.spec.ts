import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import {
  collectDispatchedEndpoints,
  collectHookFlags,
  loadDispatchedRpcHandlers,
  loadHookFeatureFlags,
} from './mobile-assets.js';
import { parseSourceFile } from './ts-ast.js';

const config = getFeatureMapAppConfig('mobile');

describe(collectHookFlags.name, () => {
  test('reads the first string argument of each flag hook call once', () => {
    const sourceFile = parseSourceFile(
      'flags.ts',
      `export function useSwapFlag() { return useBoolVariation('swap', false); }
       export function useSwapAgain() { return useBoolVariation('swap', false); }
       export function useMinimumVersion() { return useStringVariation('minimum_app_version', ''); }
       export function useOther() { return useNumberVariation('ignored', 0); }
       export function useDynamic(key: string) { return useBoolVariation(key, false); }`
    );
    expect(collectHookFlags(sourceFile, ['useBoolVariation', 'useStringVariation'])).toEqual([
      'swap',
      'minimum_app_version',
    ]);
  });
});

describe(collectDispatchedEndpoints.name, () => {
  test('finds endpoints referenced through .method or .request', () => {
    const sourceFile = parseSourceFile(
      'routing.tsx',
      `const info = getInfo.request.safeParse(message);
       switch (request.method) {
         case getAddresses.method:
           break;
       }
       const schema = signPsbt.result;
       const other = notAnEndpoint.method;`
    );
    const endpoints = new Set(['getInfo', 'getAddresses', 'signPsbt']);
    expect([...collectDispatchedEndpoints(sourceFile, endpoints).keys()]).toEqual([
      'getInfo',
      'getAddresses',
    ]);
  });
});

describe(loadDispatchedRpcHandlers.name, () => {
  test('names handlers by method string across the dispatch files', () => {
    const handlers = loadDispatchedRpcHandlers(config);
    expect(handlers.get('getInfo')?.file.endsWith('message-routing.ts')).toBe(true);
    expect(handlers.get('supportedMethods')?.methods).toEqual(['supportedMethods']);
    expect(handlers.get('stx_callContract')?.file.endsWith('browser-approver.tsx')).toBe(true);
    expect(handlers.has('signPsbt')).toBe(true);
  });
});

describe(loadHookFeatureFlags.name, () => {
  test('lists the flags the mobile flag hooks read', () => {
    const flags = loadHookFeatureFlags(config);
    expect(flags).toContain('swap');
    expect(flags).toContain('minimum_app_version');
  });
});
