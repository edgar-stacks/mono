import { RouteUrls } from '~/route-urls';

import type { WebFeatureEntry } from './web-feature-entry';

const helpCenterRedirectsSpec = 'apps/web/tests/help-center-redirects.spec.ts';
const stackingRedirectsSpec = 'apps/web/tests/stacking-redirects.spec.ts';

export const redirectsFeatures = [
  {
    id: 'support-guide-redirect',
    anchor: { kind: 'route' },
    routes: [RouteUrls.SupportGuideRedirect],
    params: [{ name: 'slug', example: 'test-guide' }],
    entry: [{ kind: 'deepLink', steps: ['Request /support/guide/<slug>'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [helpCenterRedirectsSpec],
    description:
      'A loader-only route that 301-redirects the legacy /support/guide/<slug> URL to /support/<slug>, the current guide page. It is registered before /support/:guideSlug so the literal "guide" segment wins. Route module: apps/web/app/pages/redirects/support-guide-redirect.route.tsx.',
  },
  {
    id: 'help-center-redirect',
    anchor: { kind: 'route' },
    routes: [RouteUrls.HelpCenterRedirect],
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Request /help-center'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [helpCenterRedirectsSpec],
    description:
      'A loader-only route that 301-redirects the old /help-center URL to /support via helpCenterRedirectLoader, which swaps the path prefix and keeps the query string and hash. Route module: apps/web/app/pages/redirects/help-center-redirect.route.tsx (logic in shared-redirect-logic.ts).',
  },
  {
    id: 'help-center-wildcard-redirect',
    anchor: { kind: 'route' },
    routes: [RouteUrls.HelpCenterWildcardRedirect],
    params: [{ name: '*', example: 'guide/test-guide' }],
    entry: [{ kind: 'deepLink', steps: ['Request /help-center/<path>'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [helpCenterRedirectsSpec],
    description:
      'A loader-only route that 301-redirects any /help-center/<path> to /support/<path>, preserving the rest of the path, the query string and the hash (for example /help-center/guide/x lands on /support/guide/x, which then redirects again to /support/x). Route module: apps/web/app/pages/redirects/help-center-wildcard.route.tsx (logic in shared-redirect-logic.ts).',
  },
  {
    id: 'stacking-redirect',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StackingRedirect],
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Request /stacking'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [stackingRedirectsSpec],
    description:
      'A loader-only route that 301-redirects the retired /stacking URL to /staking via stackingRedirectLoader, keeping the query string and hash. Route module: apps/web/app/pages/redirects/stacking-redirect.route.tsx (logic in shared-redirect-logic.ts).',
  },
  {
    id: 'stacking-wildcard-redirect',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StackingWildcardRedirect],
    params: [{ name: '*', example: 'pool/fast-pool/active' }],
    entry: [{ kind: 'deepLink', steps: ['Request /stacking/<path>'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [stackingRedirectsSpec],
    description:
      'A loader-only route that 301-redirects any /stacking/<path> to /staking/<path>, preserving the rest of the path, the query string and the hash, so old pool links such as /stacking/pool/fast-pool keep working. Route module: apps/web/app/pages/redirects/stacking-wildcard.route.tsx (logic in shared-redirect-logic.ts).',
  },
] as const satisfies readonly WebFeatureEntry[];
