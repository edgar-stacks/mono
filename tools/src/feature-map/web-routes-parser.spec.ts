import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { type WebRoutesOptions, parseWebRoutes } from './web-routes-parser.js';

const appDir = '/repo/apps/web/app';
const routesFile = path.join(appDir, 'routes.ts');
const sectionRoutesFile = path.join(appDir, 'pages/section/section.routes.ts');
const areasFile = path.join(appDir, 'pages/section/areas.ts');

const routeUrls = new Map([
  ['Index', '/'],
  ['About', '/about'],
  ['Section', '/section'],
  ['SectionPreview', '/section/preview'],
  ['SectionItem', '/section/item/:id'],
  ['SectionAlpha', '/section/alpha'],
  ['SectionBeta', '/section/beta'],
  ['NotFound', '/*'],
]);

const routesSource = `
import { type RouteConfig, index, route } from '@react-router/dev/routes';

import { sectionRoutes } from './pages/section/section.routes';

export default [
  index('pages/index.route.tsx'),
  route('about', 'pages/about.route.tsx'),
  ...sectionRoutes,
  route('*', 'pages/not-found.route.tsx'),
] satisfies RouteConfig;
`;

const sectionSource = `
import { type RouteConfigEntry, index, layout, prefix, route } from '@react-router/dev/routes';

import { areas } from './areas';

const previewRoutes: RouteConfigEntry[] =
  import.meta.env.MODE !== 'production'
    ? [route('preview', 'pages/section/preview.route.tsx')]
    : [];

export const sectionRoutes: RouteConfigEntry[] = prefix('section', [
  ...previewRoutes,
  layout('pages/section/section.layout.tsx', [
    index('pages/section/section.route.tsx'),
    route('item/:id', 'pages/section/item.route.tsx'),
    ...areas.map(area => route(area.slug, \`pages/section/areas/\${area.slug}.route.tsx\`)),
  ]),
]);
`;

const areasSource = `
export const areas = [
  { slug: 'alpha', title: 'Alpha' },
  { slug: 'beta', title: 'Beta' },
];
`;

function options(files: Record<string, string>): WebRoutesOptions {
  return {
    table: new Map([['RouteUrls', routeUrls]]),
    objectName: 'RouteUrls',
    aliases: { '~/': `${appDir}/` },
    layoutGates: { 'pages/section/section.layout.tsx': 'sectionLayout' },
    conditionFlags: { "import.meta.env.MODE !== 'production'": 'nonProductionBuild' },
    read(file) {
      return files[file];
    },
  };
}

const sources = {
  [routesFile]: routesSource,
  [sectionRoutesFile]: sectionSource,
  [areasFile]: areasSource,
};

describe(parseWebRoutes.name, () => {
  const { router, errors } = parseWebRoutes(routesFile, options(sources));

  function routeAt(mountedPath: string) {
    return router.routes.find(route => route.mountedPath === mountedPath);
  }

  test('mounts every index, route, layout and prefix at its absolute path', () => {
    expect(errors).toEqual([]);
    expect(router.routes.map(route => route.mountedPath)).toEqual([
      '/',
      '/about',
      '/section/preview',
      '/section',
      '/section/item/:id',
      '/section/alpha',
      '/section/beta',
      '/*',
    ]);
  });

  test('keys each route by its mounted path, index routes by the parent path', () => {
    expect(routeAt('/')?.keys).toEqual(['Index']);
    expect(routeAt('/section')).toMatchObject({ keys: ['Section'], isIndex: true });
    expect(routeAt('/section/beta')?.keys).toEqual(['SectionBeta']);
    expect(routeAt('/*')?.keys).toEqual(['NotFound']);
    expect(router.references.get('SectionItem')).toEqual([
      { key: 'SectionItem', file: sectionRoutesFile, line: 15 },
    ]);
  });

  test('records the route module and declaring file', () => {
    expect(routeAt('/about')).toMatchObject({ module: 'pages/about.route.tsx', file: routesFile });
    expect(routeAt('/section/alpha')).toMatchObject({
      module: 'pages/section/areas/alpha.route.tsx',
      file: sectionRoutesFile,
    });
  });

  test('derives gates from configured layouts and flags from configured conditions', () => {
    expect(routeAt('/section/item/:id')).toMatchObject({ gates: ['sectionLayout'], flags: [] });
    expect(routeAt('/section/preview')).toMatchObject({
      gates: [],
      flags: ['nonProductionBuild'],
    });
    expect(routeAt('/about')).toMatchObject({ gates: [], flags: [] });
  });

  test('leaves a route without a matching key unkeyed', () => {
    const result = parseWebRoutes(
      routesFile,
      options({
        ...sources,
        [routesFile]: routesSource.replace(
          "route('about', 'pages/about.route.tsx'),",
          "route('about', 'pages/about.route.tsx'),\n  route('contact', 'pages/contact.route.tsx'),"
        ),
      })
    );
    expect(result.router.routes.find(route => route.mountedPath === '/contact')?.keys).toEqual([]);
  });

  test('reports an unknown condition', () => {
    const result = parseWebRoutes(
      routesFile,
      options({
        ...sources,
        [sectionRoutesFile]: sectionSource.replace(
          "import.meta.env.MODE !== 'production'",
          'import.meta.env.DEV'
        ),
      })
    );
    expect(result.errors).toEqual([
      expect.stringContaining("unknown condition 'import.meta.env.DEV'"),
    ]);
  });

  test('reports an unknown helper', () => {
    const result = parseWebRoutes(
      routesFile,
      options({
        ...sources,
        [routesFile]: routesSource.replace(
          "route('about', 'pages/about.route.tsx')",
          "customRoute('about')"
        ),
      })
    );
    expect(result.errors).toEqual([expect.stringContaining('unknown helper customRoute()')]);
  });

  test('reports an import it cannot follow', () => {
    const result = parseWebRoutes(
      routesFile,
      options({
        ...sources,
        [routesFile]: routesSource.replace(
          "'./pages/section/section.routes'",
          "'@external/section-routes'"
        ),
      })
    );
    expect(result.errors).toEqual([
      expect.stringContaining("unknown import '@external/section-routes'"),
    ]);
  });

  test('reports a missing default export', () => {
    const result = parseWebRoutes(
      routesFile,
      options({
        ...sources,
        [routesFile]: routesSource.replace('export default [', 'export const routes = ['),
      })
    );
    expect(result.router.routes).toEqual([]);
    expect(result.errors).toEqual([expect.stringContaining('no default export')]);
  });
});
