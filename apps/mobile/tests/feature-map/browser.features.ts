import { AppRoutes } from '@/shared/app-routes';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { BrowserSelectors } from '@/shared/selectors/browser.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const messageRoutingSpec = 'apps/mobile/src/features/browser/browser/message-routing.spec.ts';

export const browserFeatures = [
  {
    id: 'browser-tab',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Browser],
    params: [{ name: 'url', example: 'https://leather.io/explorer' }],
    entry: [
      { kind: 'nav', steps: ['Tap the t`Browser` tab in the bottom tab bar (tab-layout.tsx)'] },
      {
        kind: 'nav',
        steps: [
          'Any caller of useOpenUrl (use-open-url.ts), for example a card on Connections or Recently viewed, dismisses open modals and navigates to /browser?url=<url>',
        ],
      },
      { kind: 'deepLink', steps: ['Open leather://browser?url=https://leather.io/explorer'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: BrowserSelectors.Screen,
      others: [
        BrowserSelectors.WebView,
        BrowserSelectors.SearchInput,
        BrowserSelectors.ExploreButton,
        BrowserSelectors.ConnectionsButton,
        BrowserSelectors.RecentsButton,
      ],
    },
    actions: [],
    specs: [messageRoutingSpec],
    description:
      'The in-app browser tab (app/(tabs)/browser.tsx): a WebView with the injected Leather provider (features/browser/browser/browser.tsx) above a search bar with a t`Type URL or search` input and t`Explore`, t`Connections` and t`Recents` toolbar buttons (search-bar.tsx). Explore loads LEATHER_APPS_URL; an invalid URL shows the t`Wrong URL` toast. Every finished page load records the origin as a recently_visited app with a screenshot (userAddsApp). WebView messages go through resolveBrowserRpcRequest (message-routing.ts): getInfo and supportedMethods are answered directly, any other valid request from the top-frame origin opens the approver sheet, and everything else is dropped. No Maestro flow covers it; message-routing.spec.ts covers the routing only.',
  },
  {
    id: 'browser-connections',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AppConnections],
    params: [],
    entry: [
      { kind: 'nav', steps: ['On the Browser tab tap t`Connections` in the search bar toolbar'] },
      { kind: 'deepLink', steps: ['Open leather://app-connections'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: BrowserSelectors.ConnectionsScreen,
      others: [BrowserSelectors.LinkCard, BrowserSelectors.LinkCardDisconnectButton],
    },
    actions: [],
    specs: [],
    description:
      'The t`Connections` screen (app/app-connections.tsx) lists the apps with status connected (useApps("connected")) as LinkCards, newest first; with none it shows the t`You will find the apps you are connected to here` empty state. Tapping a card opens its origin in the browser; the close icon dispatches userRemovesApp and shows the t`Disconnected` toast. Every card shares the LinkCard test id. An app becomes connected when the user approves getAddresses or stx_getAddresses. No spec covers it.',
  },
  {
    id: 'browser-recently-viewed',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AppRecentlyViewed],
    params: [],
    entry: [
      { kind: 'nav', steps: ['On the Browser tab tap t`Recents` in the search bar toolbar'] },
      { kind: 'deepLink', steps: ['Open leather://app-recently-viewed'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: BrowserSelectors.RecentlyViewedScreen,
      others: [BrowserSelectors.ScreenshotCard],
    },
    actions: [],
    specs: [],
    description:
      'The t`Recently viewed` screen (app/app-recently-viewed.tsx) shows the apps with status recently_visited (useApps("recently_visited")) as ScreenshotCards with the screenshot captured when the page finished loading; with none it shows t`You will find the apps you recently viewed here`. Tapping a card opens its origin in the browser through useOpenUrl. Every card shares the ScreenshotCard test id. No spec covers it.',
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
          'On the Browser tab load a page that calls window.LeatherProvider.request(<method>) for a method the approver handles',
          'The approver sheet slides up full height over the browser',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.Sheet,
      others: [
        ApproverSelectors.ApproveButton,
        ApproverSelectors.CancelButton,
        ApproverSelectors.CloseWindowButton,
      ],
    },
    actions: [],
    specs: [messageRoutingSpec],
    description:
      'The approver shell (features/browser/approver-sheet/approver-sheet.tsx) is a FullHeightSheet that BrowserApprover fills by request method (browser-approver.tsx); it renders nothing when the origin is not a known app (useAppByOrigin) and an empty box for an unhandled method. Closing it answers the dApp with a USER_REJECTION error; a result posts back through window.onMessageFromRN and dismisses the sheet. Every approver uses ApproverButtons (features/approver/components/approver-buttons): t`Cancel` and the approve button, then t`Submitting...`, t`Submitted` and finally t`Close window`. The rpc-bitcoin and rpc-stacks entries cover the individual methods.',
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
          'From a page in the in-app browser call window.LeatherProvider.request("getInfo")',
          'The app answers directly without opening a sheet',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [messageRoutingSpec],
    description:
      'resolveBrowserRpcRequest (features/browser/browser/message-routing.ts) recognizes getInfo and Browser answers with createGetInfoResponse (browser/utils.tsx): platform "mobile", version "<nativeApplicationVersion>/<nativeBuildVersion>" and the supported method names. Requests from a cross-origin subframe or with malformed JSON are dropped; message-routing.spec.ts covers both.',
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
          'From a page in the in-app browser call window.LeatherProvider.request("supportedMethods")',
          'The app answers directly without opening a sheet',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [messageRoutingSpec],
    description:
      'resolveBrowserRpcRequest (features/browser/browser/message-routing.ts) recognizes supportedMethods and Browser answers with createSupportedMethodsResponse (browser/utils.tsx): the developer docs link and every @leather.io/rpc endpoint not in unsupportedMethods, each with the same docsUrl. message-routing.spec.ts checks that the main frame gets an automatic answer.',
  },
] as const satisfies readonly MobileFeatureEntry[];
