import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { BrowserSelectors } from '@/shared/selectors/browser.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlockFlow = 'apps/mobile/maestro/shared/unlock.yaml';
const messageRoutingSpec = 'apps/mobile/src/features/browser/browser/message-routing.spec.ts';
const openBrowserTab = 'From Home tap the "Browser" tab';

export const browserFeatures = [
  {
    id: 'browser',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Browser],
    params: [],
    entry: [
      { kind: 'nav', steps: [openBrowserTab] },
      {
        kind: 'deepLink',
        steps: ['Open leather://browser?url=<url> to load <url> in the in-app browser'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: BrowserSelectors.SearchInput,
      others: [
        BrowserSelectors.BackButton,
        BrowserSelectors.HostnameButton,
        BrowserSelectors.ExploreButton,
        BrowserSelectors.ConnectionsButton,
        BrowserSelectors.RecentsButton,
      ],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'In-app WebView browser that starts at https://leather.io/explorer and injects the Leather provider. The navigation bar shows a back chevron (enabled when the page can go back) and the hostname, which focuses the search input with placeholder "Type URL or search"; submitting an invalid URL shows the "Wrong URL" error toast. The toolbar has "Explore" (loads https://leather.io/explorer), "Connections" (opens /app-connections) and "Recents" (opens /app-recently-viewed). Every finished page load is stored as a recently visited app with a screenshot, and pulling the page down far closes the browser sheet. The `url` query param loads that URL on open.',
  },
  {
    id: 'browser-app-connections',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AppConnections],
    params: [],
    entry: [
      { kind: 'nav', steps: [openBrowserTab, 'Tap "Connections" in the toolbar'] },
      { kind: 'deepLink', steps: ['Open leather://app-connections'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: BrowserSelectors.ConnectionsTitle,
      others: [BrowserSelectors.ConnectionCard, BrowserSelectors.ConnectionDisconnectButton],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Lists the apps connected through getAddresses or stx_getAddresses under the "Connections" header, newest first, each with its name and origin. Tapping a card opens its origin in the browser; the close icon disconnects it and shows the "Disconnected" toast. With no connected app it shows "You will find the apps you are connected to here" and no card renders.',
  },
  {
    id: 'browser-recently-viewed',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AppRecentlyViewed],
    params: [],
    entry: [
      { kind: 'nav', steps: [openBrowserTab, 'Tap "Recents" in the toolbar'] },
      { kind: 'deepLink', steps: ['Open leather://app-recently-viewed'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: BrowserSelectors.RecentlyViewedTitle,
      others: [BrowserSelectors.RecentlyViewedCard, BrowserSelectors.RecentlyViewedRemoveButton],
    },
    actions: [unlockFlow],
    specs: [],
    description:
      'Grid of the pages loaded in the in-app browser under the "Recently viewed" header, each a card with the app name and its screenshot. Tapping a card opens its origin in the browser; the close icon removes it from the list. With no visited app it shows "You will find the apps you recently viewed here" and no card renders.',
  },
  {
    id: 'browser-approver-sheet',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.Sheet'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          openBrowserTab,
          'Load a dApp page that calls a method other than getInfo or supportedMethods through window.LeatherProvider.request',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.Sheet,
      others: [ApproverSelectors.CancelButton, ApproverSelectors.ApproveButton],
    },
    actions: [unlockFlow],
    specs: [messageRoutingSpec],
    description:
      'Full-height sheet over the browser that hosts the approver for a dApp request. Requests are only presented when the posting frame has the same origin as the top frame, and only for origins the browser has stored as an app; otherwise nothing opens. A method with no approver renders an empty sheet. "Cancel" answers the dApp with a USER_REJECTION error and dismisses the sheet. The per-method approvers are the rpc-bitcoin and rpc-stacks entries.',
  },
  {
    id: 'browser-get-info',
    anchor: { kind: 'rpc', handlers: ['getInfo'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'getInfo',
        steps: [
          openBrowserTab,
          "Load a dApp page that calls window.LeatherProvider.request('getInfo')",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [unlockFlow],
    specs: [messageRoutingSpec],
    description:
      "Answered without an approver: the browser posts back platform 'mobile', the app version and build, and the supported method names. A request from a cross-origin subframe is dropped.",
  },
  {
    id: 'browser-supported-methods',
    anchor: { kind: 'rpc', handlers: ['supportedMethods'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'supportedMethods',
        steps: [
          openBrowserTab,
          "Load a dApp page that calls window.LeatherProvider.request('supportedMethods')",
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [unlockFlow],
    specs: [messageRoutingSpec],
    description:
      'Answered without an approver: the browser posts back the developer documentation link and the list of supported methods with their docs links. A request from a cross-origin subframe is dropped.',
  },
] as const satisfies readonly MobileFeatureEntry[];
