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
    open: [],
    specs: [helpCenterRedirectsSpec],
    description:
      'Resource route with no screen: 301 from /support/guide/<slug> to /support/<slug> (support-guide-redirect.route.tsx).',
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
    open: [],
    specs: [helpCenterRedirectsSpec],
    description:
      'Resource route with no screen: 301 from the old /help-center URL to /support, keeping the query and hash (helpCenterRedirectLoader in shared-redirect-logic.ts).',
  },
  {
    id: 'help-center-wildcard-redirect',
    anchor: { kind: 'route' },
    routes: [RouteUrls.HelpCenterWildcardRedirect],
    params: [{ name: '*', example: 'getting-started' }],
    entry: [{ kind: 'deepLink', steps: ['Request /help-center/<path>'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    open: [],
    specs: [helpCenterRedirectsSpec],
    description:
      'Resource route with no screen: 301 from any /help-center/<path> to /support/<path>, keeping the rest of the path, query and hash (helpCenterRedirectLoader in shared-redirect-logic.ts).',
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
    open: [],
    specs: [stackingRedirectsSpec],
    description:
      'Resource route with no screen: 301 from the retired /stacking URL to /staking, keeping the query and hash (stackingRedirectLoader in shared-redirect-logic.ts).',
  },
  {
    id: 'stacking-wildcard-redirect',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StackingWildcardRedirect],
    params: [{ name: '*', example: 'pool/fast-pool' }],
    entry: [{ kind: 'deepLink', steps: ['Request /stacking/<path>'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    open: [],
    specs: [stackingRedirectsSpec, 'apps/web/tests/xss-protection.spec.ts'],
    description:
      'Resource route with no screen: 301 from any /stacking/<path> to /staking/<path>, keeping the rest of the path, query and hash (stackingRedirectLoader in shared-redirect-logic.ts). xss-protection.spec.ts opens /stacking/faq, which lands here first.',
  },
] as const satisfies readonly WebFeatureEntry[];
