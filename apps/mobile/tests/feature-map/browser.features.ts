import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { BrowserSelectors } from '@/shared/selectors/browser.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const messageRoutingSpec = 'apps/mobile/src/features/browser/browser/message-routing.spec.ts';

export const browserFeatures = [
  {
    id: 'browser',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Browser],
    params: [{ name: 'url', example: 'https://leather.io/explorer' }],
    entry: [
      {
        kind: 'deepLink',
        steps: ['Open leather://browser?url=<https url> with a wallet set up and the app unlocked'],
      },
      {
        kind: 'nav',
        steps: [
          'Tap the browser tab',
          'Type a URL in the search field and submit, or tap "Explore" to load the Leather app explorer',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: BrowserSelectors.SearchInput,
      others: [
        BrowserSelectors.WebView,
        BrowserSelectors.NavigationBackButton,
        BrowserSelectors.NavigationUrlButton,
        BrowserSelectors.ExploreButton,
        BrowserSelectors.ConnectionsButton,
        BrowserSelectors.RecentsButton,
      ],
    },
    actions: [],
    specs: [messageRoutingSpec],
    description:
      'In-app browser tab (apps/mobile/src/app/(tabs)/browser.tsx): a WebView with the injected Leather provider (features/browser/browser/browser.tsx), a navigation bar with a back chevron and the current hostname, and a search bar with the t`Type URL or search` field and the t`Explore`, t`Connections` and t`Recents` toolbar buttons. The `url` search param is tracked as in_app_browser_opened and loaded on mount; an invalid typed URL shows the t`Wrong URL` toast. Messages from the page are routed by resolveBrowserRpcRequest in message-routing.ts: messages from another frame origin or unparsable ones are dropped, getInfo and supportedMethods are answered directly and every other method presents the approver sheet. Pulling the page down past the offset closes the browser sheet.',
  },
  {
    id: 'browser-connections',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AppConnections],
    params: [],
    entry: [
      { kind: 'deepLink', steps: ['Open leather://app-connections'] },
      { kind: 'nav', steps: ['On the browser tab tap "Connections" in the search bar toolbar'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: BrowserSelectors.ConnectionsEmptyState,
      others: [BrowserSelectors.ConnectionCard, BrowserSelectors.ConnectionDisconnectButton],
    },
    actions: [],
    specs: [],
    description:
      'Connections screen (apps/mobile/src/app/app-connections.tsx) titled t`Connections`, listing the apps with status connected (useApps("connected")). With none it shows the UFO sticker and t`You will find the apps you are connected to here`, the ready element in a fresh wallet; once a dApp is approved through getAddresses or stx_getAddresses each app renders as a LinkCard (link-card.tsx) that reopens its origin in the browser, and the close button removes the app and shows the t`Disconnected` toast.',
  },
  {
    id: 'browser-recently-viewed',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AppRecentlyViewed],
    params: [],
    entry: [
      { kind: 'deepLink', steps: ['Open leather://app-recently-viewed'] },
      { kind: 'nav', steps: ['On the browser tab tap "Recents" in the search bar toolbar'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: BrowserSelectors.RecentlyViewedEmptyState,
      others: [BrowserSelectors.RecentlyViewedCard, BrowserSelectors.RecentlyViewedRemoveButton],
    },
    actions: [],
    specs: [],
    description:
      'Recently viewed screen (apps/mobile/src/app/app-recently-viewed.tsx) titled t`Recently viewed`, listing apps with status recently_visited. With none it shows the flower sticker and t`You will find the apps you recently viewed here`, the ready element in a fresh wallet; after browsing, each app renders as a ScreenshotCard (screenshot-card.tsx) with the page screenshot that reopens the origin, and its close button removes the app.',
  },
  {
    id: 'browser-get-info',
    anchor: { kind: 'rpc', handlers: ['getInfo'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'getInfo',
        steps: [
          'Load a dApp in the browser tab',
          'The page calls request("getInfo") on the injected provider',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [messageRoutingSpec],
    description:
      'getInfo is answered without an approver: resolveBrowserRpcRequest (features/browser/browser/message-routing.ts) returns a get-info action and browser.tsx replies with createGetInfoResponse. Requests from a frame whose origin differs from the top frame are dropped.',
  },
  {
    id: 'browser-supported-methods',
    anchor: { kind: 'rpc', handlers: ['supportedMethods'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'supportedMethods',
        steps: [
          'Load a dApp in the browser tab',
          'The page calls request("supportedMethods") on the injected provider',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [messageRoutingSpec],
    description:
      'supportedMethods is answered without an approver: resolveBrowserRpcRequest (features/browser/browser/message-routing.ts) returns a supported-methods action and browser.tsx replies with createSupportedMethodsResponse.',
  },
  {
    id: 'approver-fee-sheet',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.FeeSheet'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open an approver that edits fees: sendTransfer, or a Stacks transaction (stx_transferStx, stx_callContract and the others)',
          'Tap the fee card',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: ApproverSelectors.FeeSheet, others: [ApproverSelectors.FeeCard] },
    actions: [],
    specs: [],
    description:
      'Fee picker sheet (features/approver/components/fees/fee-sheet.layout.tsx) rendered by BitcoinFeesSheet and StacksFeesSheet: low, standard and high fee options with their fiat value; choosing one rebuilds the transaction and shows a toast. The bitcoin fee card is disabled for signPsbt (feeEditorEnabled false) and while fee rates load; a sponsored Stacks transaction shows t`Sponsored fee` instead of the fee card.',
  },
] as const satisfies readonly MobileFeatureEntry[];
