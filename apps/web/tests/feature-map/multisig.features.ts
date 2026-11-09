import { ConnectSelectors } from '@tests/selectors/connect.selectors';
import { MultisigSelectors } from '@tests/selectors/multisig.selectors';
import { RouteUrls } from '~/route-urls';

import type { WebFeatureEntry } from './web-feature-entry';

const multisigSessionMocks = ['successHandlers', 'seedMultisigMockSessions'] as const;

const exampleVaultId = 'vault-stx-1';
const exampleAccountId = 'acct-cold-vault-stx-1';

export const multisigFeatures = [
  {
    id: 'multisig-transaction-preview',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigTransactionPreview],
    params: [],
    entry: [
      {
        kind: 'deepLink',
        steps: [
          'Open /multisig/transaction-preview directly in a non-production build; nothing in the app links to it',
        ],
      },
    ],
    gate: 'none',
    flags: ['nonProductionBuild'],
    preconditions: {
      session: 'uninstalled',
      mocks: [],
    },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Dev-only design-review page titled "Transaction feed — local preview" that renders the multisig TransactionList twice with hard-coded mock summaries: an "Account main column — regular" column and a "Dashboard / vault sidebar — compact" column, covering pending, signed, broadcast, confirmed and failed proposals on Stacks and Bitcoin. It needs no wallet, session or API, because the data is built inline in the page. The route is registered outside the multisig layout, so there is no session redirect, and only when import.meta.env.MODE is not production (multisig.routes.ts), so it is absent from production builds. Route module: pages/multisig/preview/transaction-list-preview.route.tsx.',
  },
  {
    id: 'multisig-sidebar-preview',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigSidebarPreview],
    params: [],
    entry: [
      {
        kind: 'deepLink',
        steps: [
          'Open /multisig/sidebar-preview directly in a non-production build; nothing in the app links to it',
        ],
      },
    ],
    gate: 'none',
    flags: ['nonProductionBuild'],
    preconditions: {
      session: 'uninstalled',
      mocks: [],
    },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Dev-only design-review page titled "Sidebar contents — local preview" that stacks every multisig sidebar panel in a 360px column with inline mock data: a compact transaction list, VaultStatusCard, AccountDetailsCard and a SignerRollcall where another member has signed and the current user has not, so the Sign affordance shows. All callbacks are no-ops and no wallet or API is needed. The route sits outside the multisig layout and is only registered when import.meta.env.MODE is not production (multisig.routes.ts). Route module: pages/multisig/preview/sidebar-preview.route.tsx.',
  },
  {
    id: 'multisig-context-preview',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigContextPreview],
    params: [],
    entry: [
      {
        kind: 'deepLink',
        steps: [
          'Open /multisig/context-preview directly in a non-production build; nothing in the app links to it',
        ],
      },
    ],
    gate: 'none',
    flags: ['nonProductionBuild'],
    preconditions: {
      session: 'uninstalled',
      mocks: [],
    },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Dev-only design-review page titled "Activity in context — local preview" that renders the multisig activity feed inside mock reconstructions of three real page layouts: Dashboard (stand-in vault tiles plus a compact feed), Account (hero, regular feed and AccountDetailsCard) and Vault (VaultBalanceHero, VaultStatusCard and a compact feed). Data is inline mock data; vault-card balances render empty because they would fetch live. The route sits outside the multisig layout and is only registered when import.meta.env.MODE is not production (multisig.routes.ts). Route module: pages/multisig/preview/context-preview.route.tsx.',
  },
  {
    id: 'multisig-dashboard',
    anchor: { kind: 'route' },
    routes: [RouteUrls.Multisig],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Click "Multisig" in the left nav (layouts/nav/nav.tsx)'],
      },
      {
        kind: 'deepLink',
        steps: [
          'Open /multisig; an optional ?invite=<vaultId> opens the invitation modal for that vault once the vault list loads',
        ],
      },
    ],
    gate: 'multisigLayout',
    flags: [],
    preconditions: {
      session: 'mock-installed',
      mocks: [...multisigSessionMocks],
    },
    selectors: {
      ready: MultisigSelectors.Dashboard,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Multisig dashboard: a "My vaults" list built from useVaults for the Bitcoin and Stacks networks (GET /v1/multisig/vaults), with invited vaults sorted first, and an "Activity" feed from useDashboardActivity that opens /multisig/vault/:vaultId/tx/:txId for a proposal. A joined vault card navigates to the vault page, an invited one opens the InvitationModal, and "Create vault" (empty state or tile) goes to /multisig/create-vault; "Connect Bitcoin" / "Connect Stacks" prompts show for a chain without a session. In mock mode entry.client.tsx runs seedMultisigMockSessions and the MSW handlers return "Vault One" (btc), "Team Treasury" and the invited "Bear Market Buying" (stx) on mainnet. With no session on either chain the route itself redirects to /multisig/onboarding, carrying ?invite through. Route module: pages/multisig/multisig.route.tsx, page: pages/multisig/dashboard/dashboard.page.tsx.',
  },
  {
    id: 'multisig-onboarding',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigOnboarding],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Without a multisig session, click "Multisig" in the left nav; the layout and the index route both redirect to /multisig/onboarding',
        ],
      },
      {
        kind: 'deepLink',
        steps: ['Open /multisig/onboarding with no multisig session stored'],
      },
    ],
    gate: 'multisigLayout',
    flags: [],
    preconditions: {
      session: 'uninstalled',
      mocks: [],
    },
    selectors: {
      ready: ConnectSelectors.ConnectCard,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Multisig sign-in screen: a "Get started with Leather Multisig" ConnectCard over a blurred backdrop with one connect row per chain (Bitcoin and Stacks), each calling useSignIn for that network, plus an "Install the extension" link and the outdated-extension callout. As soon as either chain has a session it redirects to /multisig, keeping an ?invite param. In mock mode entry.client.tsx seeds sessions for every network, so this screen only stays visible without mock mode (the uninstalled state). Route module: pages/multisig/onboarding/onboarding.route.tsx, page: onboarding.page.tsx.',
  },
  {
    id: 'multisig-create-vault',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigCreateVault],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On /multisig click "Create vault" (empty state button or the create-vault tile below the vault list)',
        ],
      },
    ],
    gate: 'multisigLayout',
    flags: [],
    preconditions: {
      session: 'mock-installed',
      mocks: [...multisigSessionMocks],
    },
    selectors: {
      ready: MultisigSelectors.CreateVault,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Create-vault form with a vault name, a chain picker (Stacks by default, Bitcoin), a theme picker and member rows, next to a VaultPreviewCard that submits. Member addresses are validated per chain and network mode, and on Stacks mainnet a member can be entered by BNS name, which is resolved and reverse-labelled. Validation messages show in the preview card after a submit attempt, a 409 from the API reports that a vault with the same members already exists, and a chain without a session shows a connect callout. Success shows a "Vault … created" toast and navigates to /multisig/vault/:vaultId; the MSW multisig handlers only cover GET reads, so creation is not mocked. Route module: pages/multisig/create-vault/create-vault.route.tsx.',
  },
  {
    id: 'multisig-settings',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigSettings],
    params: [],
    entry: [
      {
        kind: 'deepLink',
        steps: ['Open /multisig/settings directly; no link in the app points to it'],
      },
    ],
    gate: 'multisigLayout',
    flags: [],
    preconditions: {
      session: 'mock-installed',
      mocks: [...multisigSessionMocks],
    },
    selectors: {
      ready: MultisigSelectors.Settings,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Static "Multisig settings" page: a "Notifications & display" section (daily digest toggle, "Sort vaults by" and "Default landing tab" selects) and Bitcoin and Stacks sections with proposal and threshold-met alert toggles. The toggles only hold local component state and the selects are uncontrolled, so nothing is persisted or sent anywhere. It reads no data, but the multisig layout still redirects to onboarding without a session. Route module: pages/multisig/settings/settings.route.tsx.',
  },
  {
    id: 'multisig-vault',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigVault],
    params: [{ name: 'vaultId', example: exampleVaultId }],
    entry: [
      {
        kind: 'nav',
        steps: ['On /multisig click a joined vault card in "My vaults"'],
      },
      {
        kind: 'deepLink',
        steps: ['Open /multisig/vault/vault-stx-1 in mock mode'],
      },
    ],
    gate: 'multisigLayout',
    flags: [],
    preconditions: {
      session: 'mock-installed',
      mocks: [...multisigSessionMocks],
    },
    selectors: {
      ready: MultisigSelectors.Vault,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Vault detail: a balance hero, "Vault accounts" (with an "x of y accounts" badge and a create-account button gated by creator, membership and account limits), "Vault members" with invite sharing and renaming, a details card with edit and cancel, and an Activity list. The vault network is found by looking the id up in the Bitcoin and Stacks vault lists, then useVault, useVaultAccounts and useMultisigMe load the detail. An invited member sees an "Accept invite" / "Decline" callout, and declining or cancelling the vault navigates back to /multisig. While lists resolve a skeleton shows; an unknown id ends in "No vault found. It may not exist, or you may not be a member." without the Vault test id. Route module: pages/multisig/vault/vault.route.tsx.',
  },
  {
    id: 'multisig-account',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigAccount],
    params: [
      { name: 'vaultId', example: exampleVaultId },
      { name: 'accountId', example: exampleAccountId },
    ],
    entry: [
      {
        kind: 'nav',
        steps: ['On a vault page click an account row in "Vault accounts"'],
      },
      {
        kind: 'deepLink',
        steps: ['Open /multisig/vault/vault-stx-1/account/acct-cold-vault-stx-1 in mock mode'],
      },
    ],
    gate: 'multisigLayout',
    flags: [],
    preconditions: {
      session: 'mock-installed',
      mocks: [...multisigSessionMocks],
    },
    selectors: {
      ready: MultisigSelectors.Account,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Vault account page: a balance hero, "Transactions" and "Assets" tabs, and an "Account details" card with a button that adds the account to the Leather extension and, for the vault creator, an edit modal. The "Send" button opens ProposeTransactionModal; a successful proposal navigates to /multisig/vault/:vaultId/tx/:txId with autoSign route state so the proposer signs straight away. Asset rows open an asset detail modal with send and receive. Data comes from useVault and useVaultAccount (MSW returns a "Cold storage" 2-of-3 account and an empty transaction list); an unknown account ends in "No account found. It may not exist, or you may not be a member." Route module: pages/multisig/account/account.route.tsx.',
  },
  {
    id: 'multisig-activity-detail',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigActivityDetail],
    params: [
      { name: 'vaultId', example: exampleVaultId },
      { name: 'accountId', example: exampleAccountId },
      {
        name: 'txid',
        example: '0x8f3a1c9e2b7d4f6a5c0e1d2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f',
      },
    ],
    entry: [
      {
        kind: 'nav',
        steps: [
          'In a vault or account activity list click a row that has no multisig proposal (an on-chain transaction); proposal rows open the transaction route instead (components/vault-activity-list.tsx)',
        ],
      },
    ],
    gate: 'multisigLayout',
    flags: [],
    preconditions: {
      session: 'mock-installed',
      mocks: [...multisigSessionMocks],
    },
    selectors: {
      ready: MultisigSelectors.ActivityDetail,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'On-chain activity detail for a vault account transaction that was not proposed through multisig, rendered by VaultActivityDetail with links back to the vault and account and the fee in fiat. The detail comes from useBlockchainActivityByTxIdDetailQuery over the account multisig addresses; the back button goes back in history, or to the account page on a deep link. While loading a skeleton shows, and a txid with no activity ends in "No activity found for this transaction." without the ActivityDetail test id. The default mocks return no account transactions, so a real txid on the mock account renders the empty state. Route module: pages/multisig/activity/activity-detail.route.tsx.',
  },
  {
    id: 'multisig-transaction',
    anchor: { kind: 'route' },
    routes: [RouteUrls.MultisigTransaction],
    params: [
      { name: 'vaultId', example: exampleVaultId },
      { name: 'txId', example: '3f2c9a4e-6b1d-4e8a-9c7f-2d5b8e1a0c4f' },
    ],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On /multisig, a vault page or an account page click an activity row that has a multisig proposal',
        ],
      },
      {
        kind: 'nav',
        steps: [
          'On an account page propose a transaction; on success the app navigates here with autoSign route state',
        ],
      },
    ],
    gate: 'multisigLayout',
    flags: [],
    preconditions: {
      session: 'mock-installed',
      mocks: [...multisigSessionMocks],
    },
    selectors: {
      ready: MultisigSelectors.Transaction,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Multisig transaction (proposal) detail: VaultActivityDetail with the proposal status reconciled against the on-chain result, proposer, memo and fee, beside a "Signatures" SignerRollcall with Sign, Cancel and Broadcast actions that report through toasts. Data comes from useMultisigTransaction (GET /v1/multisig/transactions/:id), useVault, useVaultAccount and, once broadcast, the on-chain activity query. Arriving with autoSign route state signs automatically when the current user still owes a signature. The MSW handlers do not mock a single transaction, so in mock mode the page ends in "No transaction found. It may not exist, or you may not be a member." without the Transaction test id. Route module: pages/multisig/tx/tx.route.tsx.',
  },
  {
    id: 'multisig-session-redirect',
    anchor: { kind: 'behavior' },
    routes: [],
    startRoute: RouteUrls.Multisig,
    params: [],
    entry: [
      {
        kind: 'deepLink',
        steps: [
          'With no multisig session for the active Bitcoin or Stacks network, open any route under the multisig layout, for example /multisig or /multisig/settings',
        ],
      },
    ],
    gate: 'multisigLayout',
    flags: [],
    preconditions: {
      session: 'uninstalled',
      mocks: [],
    },
    selectors: {
      ready: ConnectSelectors.ConnectCard,
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'The multisig layout (pages/multisig/multisig.layout.tsx) bootstraps stored sessions and, once hydrated and no session restore is in flight, replaces the URL with /multisig/onboarding when neither the Bitcoin nor the Stacks network has a session. It waits for hydration and restore so a reload with a stored session does not bounce to onboarding. Which networks are checked follows the web app network (mainnet maps to btc:mainnet and stx:mainnet, anything else to testnet). In mock mode entry.client.tsx seeds sessions for every network, so the redirect only reproduces without mock mode. The three preview routes are outside the layout and never redirect.',
  },
] as const satisfies readonly WebFeatureEntry[];
