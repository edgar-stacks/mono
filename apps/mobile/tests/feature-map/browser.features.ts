import { AppRoutes } from '@/shared/app-routes';
import { AccountSelectors } from '@/shared/selectors/account.selectors';
import { ApproverSelectors } from '@/shared/selectors/approver.selectors';
import { BrowserSelectors } from '@/shared/selectors/browser.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const messageRoutingSpec = 'apps/mobile/src/features/browser/browser/message-routing.spec.ts';

export const browserFeatures = [
  {
    id: 'browser',
    anchor: { kind: 'route' },
    routes: [AppRoutes.Browser],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Tap "Browser" in the bottom tab bar'] },
      {
        kind: 'deepLink',
        steps: ['Open leather:///browser?url=<https url>; the screen reads url and loads it'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: BrowserSelectors.Screen, others: [] },
    actions: [],
    specs: [messageRoutingSpec],
    description:
      'In-app dApp browser, (tabs)/browser.tsx. The search bar ("Type URL or search") opens a URL or searches; an invalid URL shows the "Wrong URL" toast. The toolbar offers "Explore" (the Leather apps page), "Connections" and "Recents". The WebView injects the provider; message-routing.ts drops messages whose frame origin is not the top frame or not http(s), answers getInfo and supportedMethods directly and presents every other request in the approver sheet. Anything that calls useOpenUrl (help links, activity items) routes here with ?url=.',
  },
  {
    id: 'app-connections',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AppConnections],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Open the Browser tab', 'Tap "Connections" in the toolbar'] },
      { kind: 'deepLink', steps: ['Open leather:///app-connections'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: BrowserSelectors.ConnectionsScreen, others: [] },
    actions: [],
    specs: [],
    description:
      '"Connections" screen, app-connections.tsx, listing the dApps the wallet approved getAddresses or stx_getAddresses for, each with a disconnect action ("Disconnected" toast). With none it shows "You will find the apps you are connected to here".',
  },
  {
    id: 'app-recently-viewed',
    anchor: { kind: 'route' },
    routes: [AppRoutes.AppRecentlyViewed],
    params: [],
    entry: [
      { kind: 'nav', steps: ['Open the Browser tab', 'Tap "Recents" in the toolbar'] },
      { kind: 'deepLink', steps: ['Open leather:///app-recently-viewed'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: BrowserSelectors.RecentlyViewedScreen, others: [] },
    actions: [],
    specs: [],
    description:
      '"Recently viewed" screen, app-recently-viewed.tsx, with a screenshot card per visited site that reopens it in the browser. With none it shows "You will find the apps you recently viewed here".',
  },
  {
    id: 'approver-sheet',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.Sheet'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open a dApp in the Browser tab',
          'Trigger any wallet request other than getInfo or supportedMethods',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ApproverSelectors.Sheet,
      others: [ApproverSelectors.ApproveButton, ApproverSelectors.CancelButton],
    },
    actions: [],
    specs: [messageRoutingSpec],
    description:
      'Full-height sheet (approver-sheet.tsx) that hosts every dApp approver; browser-approver.tsx switches on the request method and renders nothing for an origin with no stored app. The shared buttons (approver-buttons/index.tsx) read "Cancel" and "Approve" (ApproverSelectors.CancelButton and ApproveButton), then "Submitting...", "Submitted", "Retry" after a failure, "Copy ID", "View details" and "Close window". Dismissing the sheet without answering sends the user rejection error to the dApp.',
  },
  {
    id: 'allow-mode-warning-sheet',
    anchor: { kind: 'selectors', objects: ['ApproverSelectors.AllowModeWarningSheet'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        steps: [
          'From a dApp request a Stacks transaction (stx_callContract, stx_signTransaction, …) with postConditionMode allow',
          'The sheet opens over the approver before it can be approved',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: ApproverSelectors.AllowModeWarningSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Warning sheet (allow-mode-warning-sheet.tsx) titled "Careful. This transaction could drain your wallet." for a Stacks transaction in Allow post-condition mode. The backdrop does not dismiss it; "Proceed to transaction" stays disabled until "I’m aware of the risks" is checked, and "Do not proceed" rejects the request. The approver also shows the callout "This is an “Allow Mode” transaction".',
  },
  {
    id: 'approver-account-selector',
    anchor: { kind: 'selectors', objects: ['AccountSelectors.SelectorSheet'] },
    routes: [],
    startRoute: AppRoutes.Browser,
    params: [],
    entry: [
      {
        kind: 'rpc',
        steps: [
          'From a dApp call getAddresses, stx_getAddresses or signMessage',
          'Tap the account card ("Choose an account") in the approver',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: AccountSelectors.SelectorSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'The account selector sheet opened from inside an approver (accountSelecterSheetRef in get-addresses.tsx, stx/get-addresses/get-addresses.tsx and sign-message.tsx). Picking an account changes only the account the approver answers with, not the current account of the app.',
  },
  {
    id: 'rpc-get-info',
    anchor: { kind: 'rpc', handlers: ['getInfo'] },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'getInfo',
        steps: [
          'From a page open in the Browser tab call window.LeatherProvider.request("getInfo")',
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
      'Answered by the browser without an approver: resolveBrowserRpcRequest in message-routing.ts returns get-info and browser.tsx replies with createGetInfoResponse(request). Needs no connection.',
  },
  {
    id: 'rpc-supported-methods',
    anchor: { kind: 'rpc', handlers: ['supportedMethods'] },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'supportedMethods',
        steps: [
          'From a page open in the Browser tab call window.LeatherProvider.request("supportedMethods")',
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
      'Answered by the browser without an approver: message-routing.ts returns supported-methods and browser.tsx replies with createSupportedMethodsResponse(request). Needs no connection.',
  },
] as const satisfies readonly MobileFeatureEntry[];
