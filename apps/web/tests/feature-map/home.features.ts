import { ConnectSelectors } from '@tests/selectors/connect.selectors';
import { RouteUrls } from '~/route-urls';

import type { WebFeatureEntry } from './web-feature-entry';

const modeFixtureSpec = 'apps/web/tests/mode-fixture.spec.ts';
const stakingSpec = 'apps/web/tests/bitcoin-staking.spec.ts';

export const homeFeatures = [
  {
    id: 'home-index-redirect',
    anchor: { kind: 'route' },
    routes: [RouteUrls.Index],
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Open / on the web app'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [modeFixtureSpec],
    description:
      'The index route renders nothing of its own: it emits a meta refresh to /staking and calls navigate("/staking", { replace: true }) on mount, so the landing page is the Bitcoin staking screen. The Playwright mode fixture opens / and then waits for the header wallet button (Install, Connect or the truncated address) to confirm the wallet state. Route module: apps/web/app/pages/index.route.tsx.',
  },
  {
    id: 'connect-install-leather-dialog',
    anchor: { kind: 'selectors', objects: ['ConnectSelectors.InstallLeatherDialog'] },
    routes: [],
    startRoute: RouteUrls.Index,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open the app without the Leather extension installed (and mock mode off)',
          'On the staking page click a pool "Start staking" button',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { ready: ConnectSelectors.InstallLeatherDialog, others: [] },
    actions: [],
    specs: [],
    description:
      'A sheet titled "Install Leather" asking the user to install the extension, with a Leather row whose Install button opens the Chrome Web Store listing. It is mounted globally in root.tsx and shown via the showInstallLeatherDialog atom in store/addresses.ts, which today is only set by the start-staking button when no wallet is detected. The header Install button opens the store directly instead of this dialog. Component: apps/web/app/features/install-dialog/install-dialog.tsx.',
  },
  {
    id: 'connect-missing-stacks-account-dialog',
    anchor: { kind: 'selectors', objects: ['ConnectSelectors.MissingStacksAccountDialog'] },
    routes: [],
    startRoute: RouteUrls.Index,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Click the header Connect button',
          'Approve the connection with a wallet that returns no STX address',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-installed', network: 'mainnet', mocks: [] },
    selectors: { ready: ConnectSelectors.MissingStacksAccountDialog, others: [] },
    actions: [],
    specs: [],
    description:
      'An "Unable to connect" sheet shown when a wallet connection succeeds but returns no Stacks address. The connect flow in store/addresses.ts revokes or disconnects the wallet and sets showMissingStacksKeysDialog to "leather" or "generic"; the Leather variant links to open the extension full page to connect Stacks with a Ledger, the generic variant asks the user to enable a Stacks account. It is rendered by the header SignInButton in apps/web/app/features/sign-in-button/sign-in-button.tsx.',
  },
  {
    id: 'connect-mock-wallet-dialog',
    anchor: { kind: 'selectors', objects: ['ConnectSelectors.MockWalletDialog'] },
    routes: [],
    startRoute: RouteUrls.Index,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Enable mock mode (leather-mock-mode=true in localStorage, or the Mock mode toggle)',
          'Trigger any wallet request, e.g. click the header Connect button',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-installed', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: {
      ready: ConnectSelectors.MockWalletDialog,
      others: [ConnectSelectors.MockWalletResolveButton, ConnectSelectors.MockWalletRejectButton],
    },
    actions: [],
    specs: [stakingSpec],
    description:
      'In mock mode, RPC requests to the fake LeatherProvider are surfaced in a sheet titled with the RPC method, showing the request payload and the canned response as JSON. Resolve dispatches the canned response (mock addresses for getAddresses/stx_getAddresses, a fixed txid for stx_callContract, {} otherwise) and Reject dispatches an RPC error. The Playwright fixture resolves it to build the mock-connected session, and the staking spec resolves contract calls through it. Components: apps/web/app/features/mock-dialog/mock-dialog.tsx and mock-dialog.layout.tsx, mounted in root.tsx.',
  },
] as const satisfies readonly WebFeatureEntry[];
