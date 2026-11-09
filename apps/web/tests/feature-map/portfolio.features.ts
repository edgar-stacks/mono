import { ConnectSelectors } from '@tests/selectors/connect.selectors';
import { SbtcSelectors } from '@tests/selectors/sbtc.selectors';
import { RouteUrls } from '~/route-urls';

import type { WebFeatureEntry } from './web-feature-entry';

export const portfolioFeatures = [
  {
    id: 'portfolio',
    anchor: { kind: 'route' },
    routes: [RouteUrls.Portfolio],
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Open /portfolio'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: { others: [ConnectSelectors.ConnectCard] },
    actions: [],
    specs: [],
    description:
      'The connected account portfolio: a total balance summary, an allocation chart, an asset table of BTC, STX and SIP-10 tokens sorted by fiat value, and an activity list. Balances and activity come from client-side React Query hooks (btc, stx, sip10 and total balance hooks plus useActivity) for the connected addresses. When no wallet is connected the page shows dummy portfolio data behind a "Get started with Leather" connect card overlay; before hydration it renders a skeleton. Route module: apps/web/app/pages/portfolio/portfolio.route.tsx (page in portfolio.page.tsx).',
  },
  {
    id: 'sbtc-rewards',
    anchor: { kind: 'route' },
    routes: [RouteUrls.Sbtc],
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Open /sbtc'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: {
      others: [SbtcSelectors.RewardsSunsetCallout, SbtcSelectors.RewardsSunsetLink],
    },
    actions: [],
    specs: [],
    description:
      'The sBTC Rewards page: an APY hero card, a "Get sBTC" step with bridge BTC and swap STX actions that open the extension swap via the Leather SDK, a "Choose sBTC rewards provider" step listing CMS-managed pools with external "Start earning" links, and an FAQ. The loader fetches sbtcPoolsQuery, sbtcFaqQuery and sbtcConceptsQuery from the CMS. An always-rendered rewards sunset callout (sbtc-rewards-sunset-callout.tsx, copy from content/sbtc-content.ts) sits above the pool list with an external link. Route module: apps/web/app/pages/sbtc/sbtc.route.tsx (page in sbtc-rewards.tsx).',
  },
] as const satisfies readonly WebFeatureEntry[];
