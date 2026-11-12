import { HomePageSelectors } from '@tests/selectors/home.selectors';
import { ApprovalScreensPreviewSelectors } from '@tests/selectors/requests.selectors';
import { SwapRevampSelectors } from '@tests/selectors/swap-revamp.selectors';

import { RouteUrls } from '@shared/route-urls';

import type { ExtensionFeatureEntry } from './extension-feature-entry';

const defaultMocks = ['setupMockApis', 'mockUnhandledRequests'] as const;

export const rpcGeneralFeatures = [
  {
    id: 'rpc-open',
    anchor: { kind: 'rpc', handlers: ['open'] },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'open',
        steps: [
          'From a connected origin call window.LeatherProvider.request("open", { mode?: "popup" | "fullpage" })',
          'popup mode (the default) opens the Home route in a request popup; a locked wallet shows the unlock screen first; fullpage opens a new tab with the wallet',
          'The handler sends { success: true } immediately after asking for the window, without awaiting it (open.ts); an origin that never connected gets error 16 "Permission denied, user must first connect to the wallet"',
        ],
      },
    ],
    gate: 'account',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [...defaultMocks] },
    selectors: {
      ready: HomePageSelectors.HomePageContainer,
      others: [HomePageSelectors.SendCryptoAssetBtn],
    },
    actions: ['HomePage.lock'],
    specs: ['apps/extension/tests/specs/rpc-open/open.spec.ts'],
    description:
      'Handler apps/extension/src/background/messaging/rpc-methods/open.ts. It opens the wallet for a dApp that already has permission (validateConnectedWalletExists) and has no approver of its own: the popup is the regular home screen behind the account gate. open.spec.ts connects by approving getAddresses, then captures the popup and asserts HomePageContainer and SendCryptoAssetBtn; it also covers the 16 rejection and the locked-wallet unlock.',
  },
  {
    id: 'rpc-open-swap',
    anchor: { kind: 'rpc', handlers: ['open-swap'] },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'openSwap',
        steps: [
          'From localhost:3000 click the test-app openSwap card (data-testid "openSwap"), which sends { base: "STX", quote: "sBTC" }, or call window.LeatherProvider.request("openSwap", { base, quote }); the published schema types both as required strings, but the handler tolerates missing or invalid ones',
          'The background opens the swap form in its own window at /swap/bitcoin/BTC/<quote> when base is BTC, otherwise /swap/stacks/<base>/<quote> (no /<quote> segment when quote is missing or invalid; replace-route-params.ts); base defaults to STX and symbols must match /^[a-zA-Z0-9$._-]{1,32}$/ or are dropped',
          'The request resolves { message: "Success" } once the window opens; the swap itself is the swap-form entry',
        ],
      },
    ],
    gate: 'account',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [...defaultMocks] },
    selectors: { ready: SwapRevampSelectors.FormReady, others: [] },
    actions: [],
    specs: [],
    description:
      'Handler apps/extension/src/background/messaging/rpc-methods/open-swap.ts. It only chooses the swap route from the params and opens it in a swap window (a full-page tab in the test build, triggerSwapWindowOpen in rpc-request-utils.ts); there is no permission check, no schema validation (a base that fails the symbol regex falls back to STX and an invalid quote is dropped) and no approver. No extension spec covers it.',
  },
  {
    id: 'rpc-supported-methods',
    anchor: { kind: 'rpc', handlers: ['supported-methods'] },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'rpc',
        method: 'supportedMethods',
        steps: [
          'Call window.LeatherProvider.request("supportedMethods")',
          'The background answers directly with { documentation, methods: [{ name, docsUrl }] } and opens no window',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-out', mocks: [...defaultMocks] },
    selectors: { others: [] },
    actions: [],
    specs: [],
    description:
      'Handler apps/extension/src/background/messaging/rpc-methods/supported-methods.ts. Pure background response with a hard-coded list of 15 methods and their gitbook links; it omits the registered btc_addAccount and stx_addAccount (rpc-message-handler.ts). No UI and no session requirement. No extension spec; the test-app supportedMethods card (tagged ci) exercises it.',
  },
  {
    id: 'approval-screens-preview',
    anchor: { kind: 'route' },
    routes: [RouteUrls.ApprovalScreensPreview],
    params: [],
    entry: [
      {
        kind: 'deepLink',
        steps: [
          'Open index.html#/approval-screens-preview in a build with WALLET_ENVIRONMENT development or testing; production builds do not register the route',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [...defaultMocks] },
    selectors: { ready: ApprovalScreensPreviewSelectors.Heading, others: [] },
    actions: [],
    specs: ['apps/extension/tests/specs/screenshots/approval-screens-preview.spec.ts'],
    description:
      'Developer-only page (approval-screens-preview.tsx) that renders the real approval layout components from fixtures in 390×756 frames: shared header, contract call, allow mode, deploy, two STX transfers, multisig co-sign, sponsored fee, "Connect app" and the legacy message-signing header. app-routes.tsx registers it only when IS_DEV_ENV or IS_TEST_ENV, lazy-loaded and without a gate. The contract-call frames load the bns contract interface, so their arguments need the network. approval-screens-preview.spec.ts opens it and asserts the "Approval screens — live components" heading.',
  },
] as const satisfies readonly ExtensionFeatureEntry[];
