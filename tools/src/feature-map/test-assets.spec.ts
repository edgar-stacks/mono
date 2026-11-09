import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import {
  loadMockFunctions,
  loadNetworkIds,
  loadPersistWhitelist,
  loadRouterFiles,
  loadRpcCatalog,
  loadRpcHandlers,
  loadSelectorObjects,
  loadSetupMocks,
  loadVerifyMockRegistry,
} from './test-assets.js';

const config = getFeatureMapAppConfig('extension');
const tempDir = mkdtempSync(path.join(tmpdir(), 'feature-map-assets-'));

describe(loadSelectorObjects.name, () => {
  test('enumerates every exported *Selectors object with its members', () => {
    const objects = loadSelectorObjects(config);
    const switcher = objects.get('SwitchAccountSelectors');
    expect(switcher?.file.endsWith('switch-account.selectors.ts')).toBe(true);
    expect(switcher?.members).toContain('WalletHeaderName');
    expect(objects.has('getSwitchAccountSheetAccountNameSelector')).toBe(false);
    expect([...objects.keys()].every(name => name.endsWith('Selectors'))).toBe(true);
  });
});

describe(loadSetupMocks.name, () => {
  test('lists the exported mock functions setupMockApis registers', () => {
    const setup = loadSetupMocks(config, loadMockFunctions(config));
    expect(setup?.file.endsWith('mock-apis.ts')).toBe(true);
    expect(setup?.members).toContain('mockStacksFeeRequests');
    expect(setup?.members).toContain('mockNetworkValidationRequests');
    expect(setup?.members).not.toContain('setupMockApis');
    expect(setup?.members).not.toContain('mockUnhandledRequests');
  });

  test('is undefined when the mocks dir has no such function', () => {
    const setup = loadSetupMocks(
      { ...config, setupMocksFunctionName: 'setupNothing' },
      loadMockFunctions(config)
    );
    expect(setup).toBeUndefined();
  });
});

describe(loadRpcHandlers.name, () => {
  test('enumerates handler files by basename with the methods they register', () => {
    const handlers = loadRpcHandlers(config);
    expect(handlers.get('open')?.methods).toEqual(['open']);
    expect(handlers.get('supported-methods')?.methods).toEqual(['supportedMethods']);
    expect(handlers.get('open')?.file.endsWith('rpc-methods/open.ts')).toBe(true);
    expect([...handlers.keys()].some(name => name.endsWith('.spec'))).toBe(false);
  });
});

describe(loadRouterFiles.name, () => {
  test('discovers files that render a Route or are named as route groups, minus the exclude list', () => {
    const appDir = path.join(tempDir, 'app');
    const files = {
      'features/x/x-routes.tsx': 'export const xRoutes = generateRpcRoutes({ path: RouteUrls.X });',
      'routes/y-stuff.tsx': 'export function Y() { return <Routes><Route path="/y" /></Routes>; }',
      'routes/wrapper.tsx': 'export function W() { return <Route path="*" />; }',
      'components/plain.tsx': 'export function Plain() { return <div />; }',
      'routes/y-stuff.spec.tsx': 'test("x", () => <Route />);',
    };
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(appDir, name)), { recursive: true });
      writeFileSync(path.join(appDir, name), text);
    }
    const discovered = loadRouterFiles({
      ...config,
      routerScanDirs: [appDir],
      routerExcludeFiles: [path.join(appDir, 'routes/wrapper.tsx')],
    });
    expect(discovered).toEqual([
      path.join(appDir, 'features/x/x-routes.tsx'),
      path.join(appDir, 'routes/y-stuff.tsx'),
    ]);
  });

  test('finds every router file of the extension', () => {
    const names = loadRouterFiles(config).map(file => path.basename(file));
    expect(names).toContain('app-routes.tsx');
    expect(names).toContain('rpc-routes.tsx');
    expect(names).toContain('home.tsx');
    expect(names).toContain('rpc-stx-call-contract.routes.tsx');
    expect(names).not.toContain('modal-background-wrapper.tsx');
  });
});

describe(loadVerifyMockRegistry.name, () => {
  test('lists the mocks verify can apply, each an exported mock function', () => {
    const registry = loadVerifyMockRegistry(config);
    const mocks = loadMockFunctions(config);
    expect(registry).toContain('setupMockApis');
    expect(registry).toContain('mockUnhandledRequests');
    expect([...registry].every(name => mocks.has(name))).toBe(true);
  });

  test('throws when the registry object is missing', () => {
    const file = path.join(tempDir, 'empty-registry.ts');
    writeFileSync(file, 'export const somethingElse = {};');
    expect(() => loadVerifyMockRegistry({ ...config, verifyMockRegistryFile: file })).toThrow(
      "does not define a 'verifyMockRegistry' object"
    );
  });
});

describe(loadPersistWhitelist.name, () => {
  test('reads the persisted slice keys', () => {
    const whitelist = loadPersistWhitelist(config);
    expect(whitelist).toEqual(expect.arrayContaining(['active', 'networks', 'wallets']));
    expect(whitelist).toContain('softwareKeys');
  });
});

describe(loadNetworkIds.name, () => {
  test('reads the default wallet network ids', () => {
    expect(loadNetworkIds(config)).toEqual(expect.arrayContaining(['mainnet', 'testnet4']));
  });
});

describe(loadRpcCatalog.name, () => {
  test('maps every test-app catalog id to its rpc method', () => {
    const catalog = loadRpcCatalog(config);
    expect(catalog.get('getAddresses')?.method).toBe('getAddresses');
    expect(catalog.get('open-popup')?.method).toBe('open');
    expect(catalog.get('signMessage-p2tr')?.method).toBe('signMessage');
    expect(catalog.get('open-popup')?.file.endsWith('methods/general.ts')).toBe(true);
  });
});
