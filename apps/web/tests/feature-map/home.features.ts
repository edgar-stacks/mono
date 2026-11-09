import { ConnectSelectors } from '@tests/selectors/connect.selectors';
import { RouteUrls } from '~/route-urls';

import type { WebFeatureEntry } from './web-feature-entry';

const modeFixtureSpec = 'apps/web/tests/mode-fixture.spec.ts';
const bitcoinStakingSpec = 'apps/web/tests/bitcoin-staking.spec.ts';

export const homeFeatures = [
  {
    id: 'index-redirect',
    anchor: { kind: 'route' },
    routes: [RouteUrls.Index],
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Open /'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    open: [],
    specs: [modeFixtureSpec],
    description:
      'The site root renders nothing: a meta refresh and a replace navigation send it to /staking (index.route.tsx), so a screen at / is the staking overview. The mode fixture in tests/fixtures.ts opens / and waits for the header wallet button ("Install", "Connect" or the truncated address) before every web spec.',
  },
  {
    id: 'not-found',
    anchor: { kind: 'route' },
    routes: [RouteUrls.NotFound],
    params: [{ name: '*', example: 'does-not-exist' }],
    entry: [
      { kind: 'deepLink', steps: ['Open any path no other route matches, e.g. /does-not-exist'] },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    open: [],
    specs: [],
    description:
      'The fallback route: "Oops! It seems like you took a wrong turn" with a "Return home" button that links to /staking (not-found.tsx). It sits inside the root NetworkGate, so on testnet it shows "Not available on testnet" instead.',
  },
  {
    id: 'install-leather-dialog',
    anchor: { kind: 'selectors', objects: ['ConnectSelectors.InstallLeatherDialog'] },
    routes: [],
    startRoute: RouteUrls.Staking,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Without a wallet extension, open /staking',
          'Click a "Start staking" button in the pool table (start-staking-button.tsx opens the dialog when no wallet is detected)',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'mainnet', mocks: [] },
    selectors: { ready: ConnectSelectors.InstallLeatherDialog, others: [] },
    actions: [],
    open: [],
    specs: [],
    description:
      'Sheet titled "Install Leather" with "Please install Leather wallet extension to proceed" and an "Install" button that opens the Chrome web store (install-dialog.tsx, mounted once in root.tsx). The header "Install" button does not open it; it links to the store directly (install-leather-button.tsx).',
  },
  {
    id: 'missing-stacks-account-dialog',
    anchor: { kind: 'selectors', objects: ['ConnectSelectors.MissingStacksAccountDialog'] },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Connect a wallet whose getAddresses response has no STX address',
          'useLeatherConnect.connect revokes the permissions and opens the dialog (store/addresses.ts)',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-installed', network: 'mainnet', mocks: [] },
    selectors: { ready: ConnectSelectors.MissingStacksAccountDialog, others: [] },
    actions: [],
    open: [],
    specs: [],
    description:
      'Sheet titled "Unable to connect" with "Your wallet does not have a Stacks account available." For Leather it adds an "Open Leather" link and Ledger instructions; for another wallet it says to enable a Stacks account and retry (NoStacksAccountsWarningDialog in sign-in-button.tsx). The mock wallet always returns an STX address, so no spec reaches it; reproduce it with a getAddresses response without STX.',
  },
  {
    id: 'mock-wallet-dialog',
    anchor: { kind: 'selectors', objects: ['ConnectSelectors.MockWalletDialog'] },
    routes: [],
    startRoute: RouteUrls.Staking,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Enable mock mode (the mode fixture seeds leather-mock-mode in localStorage)',
          'Trigger any wallet request, e.g. the header "Connect" button or a stake confirmation',
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
    open: [],
    specs: [bitcoinStakingSpec],
    description:
      'Stand-in for the extension popup in mock mode: a sheet headed by the RPC method name with the request and the canned response as JSON, a "Resolve" button that answers with the response and a "Reject" button that answers with a user-rejection error (mock-dialog.tsx, mock-dialog.layout.tsx). getAddresses resolves with the mock STX address; stx_callContract resolves with a fixed txid. The connect fixture and the staking specs click Resolve or Reject to finish every wallet request.',
  },
  {
    id: 'mock-mode',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          "Set localStorage 'leather-mock-mode' to 'true' before the app loads, or use the header mock-mode toggle",
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: {
      session: 'mock-installed',
      network: 'mainnet',
      mocks: ['successHandlers', 'seedMultisigMockSessions'],
    },
    selectors: { others: [] },
    actions: [],
    open: [],
    specs: [modeFixtureSpec],
    description:
      'Mock mode makes the web app runnable without an extension or live APIs: entry.client.tsx seeds multisig sessions (seedMultisigMockSessions), starts the in-page MSW worker with the API mocks and the mock wallet answers every request through the mock wallet dialog. The header shows a "Mock mode on" toggle. Per-test variants are localStorage flags read by the mocks (leather-mock-stx-balance, leather-mock-pox5-staked and others in bitcoin-staking.spec.ts), because Playwright-level handlers never see the worker\'s requests.',
  },
  {
    id: 'network-gate',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Switch the global network to testnet', 'Open any route outside /multisig'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'uninstalled', network: 'testnet', mocks: [] },
    selectors: { others: [] },
    actions: [],
    open: [],
    specs: [],
    description:
      'The root layout wraps every route in NetworkGate (root.tsx), which is not part of the route config. Off mainnet, any path outside /multisig renders "Not available on <network>" with a "Switch to mainnet" button instead of the page (network-gate.tsx, network-support.ts). Every entry outside /multisig therefore records network mainnet.',
  },
] as const satisfies readonly WebFeatureEntry[];
