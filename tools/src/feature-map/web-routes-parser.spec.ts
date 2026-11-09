import { describe, expect, test } from 'vitest';

import { getFeatureMapAppConfig } from './app-config.js';
import { readFromDisk } from './routers-parser.js';
import { loadRouteUrls } from './test-assets.js';
import { type StringTable } from './ts-ast.js';
import { type WebRouteConfigOptions, parseWebRouteConfig } from './web-routes-parser.js';

const appDir = '/repo/apps/web/app';
const routeConfigFile = `${appDir}/routes.ts`;

const routeUrls = new Map([
  ['Index', '/'],
  ['Docs', '/docs'],
  ['DocsPage', '/docs/:slug'],
  ['Admin', '/admin'],
  ['AdminUsers', '/admin/users'],
  ['AdminPreview', '/admin/preview'],
  ['Lab', '/lab'],
  ['LabAlpha', '/lab/alpha'],
  ['LabBeta', '/lab/beta'],
  ['NotFound', '/*'],
]);

const table: StringTable = new Map([['RouteUrls', routeUrls]]);

const adminRoutes = `
import { type RouteConfigEntry, index, layout, prefix, route } from '@react-router/dev/routes';

const previewRoutes: RouteConfigEntry[] =
  import.meta.env.MODE !== 'production'
    ? [route('preview', 'pages/admin/preview.route.tsx')]
    : [];

export const adminRoutes: RouteConfigEntry[] = prefix('admin', [
  ...previewRoutes,
  layout('pages/admin/admin.layout.tsx', [
    index('pages/admin/admin.route.tsx'),
    route('users', 'pages/admin/users.route.tsx'),
  ]),
]);
`;

const labAreas = `
export const labAreas = [
  { slug: 'alpha', title: 'Alpha', issue: 1 },
  { slug: 'beta', title: 'Beta' },
];
`;

const labRoutes = `
import { type RouteConfigEntry, index, layout, prefix, route } from '@react-router/dev/routes';

import { labAreas } from './lab-areas';

export const labRoutes: RouteConfigEntry[] = prefix('lab', [
  layout('pages/lab/lab.layout.tsx', [
    index('pages/lab/lab-index.route.tsx'),
    ...labAreas.map(area => route(area.slug, \`pages/lab/areas/\${area.slug}.route.tsx\`)),
  ]),
]);
`;

const rootRoutes = `
import { type RouteConfig, index, route } from '@react-router/dev/routes';

import { adminRoutes } from './pages/admin/admin.routes';
import { labRoutes } from './pages/lab/lab.routes';

export default [
  index('pages/index.route.tsx'),
  route('docs', 'pages/docs.route.tsx', [route(':slug', 'pages/docs-page.route.tsx')]),
  ...adminRoutes,
  ...labRoutes,
  route('*', 'pages/not-found.route.tsx'),
] satisfies RouteConfig;
`;

function reader(files: Record<string, string>) {
  return (file: string) => files[file];
}

const options: WebRouteConfigOptions = {
  routeConfigFile,
  table,
  objectName: 'RouteUrls',
  layoutGates: { 'pages/admin/admin.layout.tsx': 'adminLayout' },
  conditionFlags: { "import.meta.env.MODE !== 'production'": 'nonProductionBuild' },
};

const files = {
  [routeConfigFile]: rootRoutes,
  [`${appDir}/pages/admin/admin.routes.ts`]: adminRoutes,
  [`${appDir}/pages/lab/lab.routes.ts`]: labRoutes,
  [`${appDir}/pages/lab/lab-areas.ts`]: labAreas,
};

function parse(overrides: Record<string, string> = {}) {
  return parseWebRouteConfig(options, reader({ ...files, ...overrides }));
}

describe(parseWebRouteConfig.name, () => {
  test('mounts every index, route, layout and prefix at its absolute path', () => {
    const { router, errors } = parse();
    expect(errors).toEqual([]);
    expect(router.routes.map(route => route.mountedPath)).toEqual([
      '/',
      '/docs',
      '/docs/:slug',
      '/admin/preview',
      '/admin',
      '/admin/users',
      '/lab',
      '/lab/alpha',
      '/lab/beta',
      '/*',
    ]);
  });

  test('resolves each mounted path to its RouteUrls key', () => {
    const { router } = parse();
    expect(router.routes.map(route => route.keys)).toEqual([
      ['Index'],
      ['Docs'],
      ['DocsPage'],
      ['AdminPreview'],
      ['Admin'],
      ['AdminUsers'],
      ['Lab'],
      ['LabAlpha'],
      ['LabBeta'],
      ['NotFound'],
    ]);
    expect(router.references.get('LabBeta')).toEqual([
      { key: 'LabBeta', file: `${appDir}/pages/lab/lab.routes.ts`, line: 9 },
    ]);
  });

  test('records the route module and the declaring file', () => {
    const { router } = parse();
    const users = router.routes.find(route => route.mountedPath === '/admin/users');
    expect(users?.module).toBe(`${appDir}/pages/admin/users.route.tsx`);
    expect(users?.file).toBe(`${appDir}/pages/admin/admin.routes.ts`);
    expect(users?.line).toBe(13);
    const alpha = router.routes.find(route => route.mountedPath === '/lab/alpha');
    expect(alpha?.module).toBe(`${appDir}/pages/lab/areas/alpha.route.tsx`);
  });

  test('gates routes only by the configured layouts', () => {
    const { router } = parse();
    const gates = Object.fromEntries(router.routes.map(route => [route.mountedPath, route.gates]));
    expect(gates['/admin']).toEqual(['adminLayout']);
    expect(gates['/admin/users']).toEqual(['adminLayout']);
    expect(gates['/admin/preview']).toEqual([]);
    expect(gates['/lab/alpha']).toEqual([]);
  });

  test('flags routes registered inside a configured condition', () => {
    const { router } = parse();
    const flagged = router.routes.filter(route => route.flags.length > 0);
    expect(flagged.map(route => [route.mountedPath, route.flags])).toEqual([
      ['/admin/preview', ['nonProductionBuild']],
    ]);
  });

  test('nests child routes under their parent route', () => {
    const { router } = parse();
    const page = router.routes.find(route => route.mountedPath === '/docs/:slug');
    expect(page?.parentKeys).toEqual(['Docs']);
  });

  test('reports an unknown condition', () => {
    const { errors } = parse({
      [`${appDir}/pages/admin/admin.routes.ts`]: adminRoutes.replace(
        "import.meta.env.MODE !== 'production'",
        'isStaging'
      ),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("unknown route condition 'isStaging'");
  });

  test('reports an unknown helper', () => {
    const { errors } = parse({
      [routeConfigFile]: rootRoutes.replace(
        "route('*', 'pages/not-found.route.tsx')",
        "fallback('pages/not-found.route.tsx')"
      ),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('unknown route helper fallback');
  });

  test('reports an import it cannot resolve', () => {
    const { errors } = parse({
      [routeConfigFile]: rootRoutes.replace("'./pages/lab/lab.routes'", "'@external/lab-routes'"),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("import 'labRoutes' from '@external/lab-routes'");
  });

  test('reports a missing default export', () => {
    const { router, errors } = parse({
      [routeConfigFile]: rootRoutes.replace('export default', 'export const routes ='),
    });
    expect(router.routes).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('no default export');
  });

  test('resolves every route of the web app to a RouteUrls key', () => {
    const config = getFeatureMapAppConfig('web');
    const webRouteUrls = loadRouteUrls(config);
    const { routeConfigFile: webRouteConfigFile } = config;
    expect(webRouteConfigFile).toBeDefined();
    if (webRouteConfigFile === undefined) return;
    const { router, errors } = parseWebRouteConfig(
      {
        routeConfigFile: webRouteConfigFile,
        table: new Map([[config.routeUrlsObjectName, webRouteUrls]]),
        objectName: config.routeUrlsObjectName,
        importAliases: config.importAliases,
        layoutGates: config.layoutGates,
        conditionFlags: config.conditionFlags,
      },
      readFromDisk
    );
    expect(errors).toEqual([]);
    expect(router.routes.filter(route => route.keys.length !== 1)).toEqual([]);
    const routedKeys = router.routes.flatMap(route => route.keys).sort();
    expect(routedKeys).toEqual([...webRouteUrls.keys()].sort());
  });
});
