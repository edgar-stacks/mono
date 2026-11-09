import { ConnectSelectors } from '@tests/selectors/connect.selectors';
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
    selectors: { others: [] },
    actions: [],
    open: [],
    specs: [],
    description:
      'Portfolio of the connected account (portfolio.page.tsx, client-only with a skeleton fallback): total balance summary, the BTC, STX and SIP-10 asset table sorted by value, an allocation chart and the activity list. Without a connected wallet it renders the same layout with dummy data behind the wallet connection modal.',
  },
  {
    id: 'portfolio-wallet-connection-modal',
    anchor: { kind: 'selectors', objects: ['ConnectSelectors.ConnectCard'] },
    routes: [],
    startRoute: RouteUrls.Portfolio,
    params: [],
    entry: [{ kind: 'nav', steps: ['Open /portfolio without a connected wallet'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-installed', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: { ready: ConnectSelectors.ConnectCard, others: [] },
    actions: [],
    open: [],
    specs: [],
    description:
      'Connect card "Get started with Leather" over the dummy portfolio (wallet-connection-modal.tsx) with a "Connect" row that calls useLeatherConnect.connect and an "Install" row that opens the Chrome web store. The same ConnectCard component also fronts multisig onboarding.',
  },
] as const satisfies readonly WebFeatureEntry[];
