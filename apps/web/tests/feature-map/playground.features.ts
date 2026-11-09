import { PlaygroundSelectors } from '@tests/selectors/playground.selectors';
import { RouteUrls } from '~/route-urls';

import type { WebFeatureEntry } from './web-feature-entry';

const dockNavStep =
  'Open the floating playground dock pill at the bottom of any /playground page, pick the section and click the area';

export const playgroundFeatures = [
  {
    id: 'playground-index',
    anchor: { kind: 'route' },
    routes: [RouteUrls.Playground],
    params: [],
    entry: [
      {
        kind: 'deepLink',
        steps: [
          'Open /playground on local dev, a PR preview or staging; nothing in the app nav links to it',
        ],
      },
      {
        kind: 'nav',
        steps: ['From any playground area open the dock and click "All areas"'],
      },
    ],
    gate: 'playgroundLayout',
    flags: [],
    preconditions: {
      session: 'uninstalled',
      network: 'mainnet',
      mocks: [],
    },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Playground index: a "Playground areas" grid with one card per entry in the playground-areas.ts registry, showing the area title, its issue number, description and lifecycle status (exploration or living), each linking to /playground/<slug>. It renders on a bare canvas without the site nav, since only areas with appShell opt back into the website container (isBareCanvasPath in playground.constants.ts). The playground layout adds only the floating PlaygroundDock and its loader throws a 404 for every /playground route when CLOUDFLARE_ENV is production, so the area exists on local dev, PR previews and staging but not on app.leather.io. Route module: pages/playground/playground-index.route.tsx.',
  },
  {
    id: 'playground-staking-acknowledgment',
    anchor: { kind: 'route' },
    routes: [RouteUrls.PlaygroundStakingAcknowledgment],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On /playground click the "Staking acknowledgment" card'],
      },
      {
        kind: 'deepLink',
        steps: [
          'Open /playground/staking-acknowledgment?pool=<providerId>&flow=start|switch, for example ?pool=byosm&flow=switch',
        ],
      },
    ],
    gate: 'playgroundLayout',
    flags: [],
    preconditions: {
      session: 'uninstalled',
      network: 'mainnet',
      mocks: [],
    },
    selectors: {
      ready: PlaygroundSelectors.StakingAcknowledgmentReview,
      others: [PlaygroundSelectors.ReviewConfirmSwitch],
    },
    actions: [],
    specs: [],
    description:
      'Exploration area (issue #2605) for reviewing the staking acknowledgment in the start-staking and switch-pool flows across payout models. "Start staking" / "Switch pool" buttons and a "Review pool" select (Fast Pool, Stacking DAO, PlanBetter, custom signer manager) write ?pool and ?flow to the URL. The review surface (PlaygroundSelectors.StakingAcknowledgmentReview) has editable amount and cycle fields and either the real StakingConfirmationSteps (start) or a SidebarSummaryCard diffing from Xverse with a "Confirm switch" button (PlaygroundSelectors.ReviewConfirmSwitch) that shows the required-acknowledgment error until the box is checked. Confirming only shows "Preview confirmed. No transaction was sent." and all data is sample data. Renders inside the app shell; 404s on the production deploy. Route module: pages/playground/areas/staking-acknowledgment/staking-acknowledgment.route.tsx.',
  },
  {
    id: 'playground-component-gallery',
    anchor: { kind: 'route' },
    routes: [RouteUrls.PlaygroundComponentGallery],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On /playground click the "Component gallery" card', dockNavStep],
      },
    ],
    gate: 'playgroundLayout',
    flags: [],
    preconditions: {
      session: 'uninstalled',
      network: 'mainnet',
      mocks: [],
    },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Living area "Multisig component gallery": every multisig view surface and permutation stacked with mock data, so the real components can be reviewed without a wallet or the multisig backend. Sections cover balance heroes, the AccountDetailsCard and VaultStatusCard, the activity feed in several contexts, the ListItemBox primitive, badges, avatars and chain pills, CopyAddress, and form fields with CreateVaultTile and MultisigErrorState. Renders inside the app shell; 404s on the production deploy. Route module: pages/playground/areas/component-gallery/component-gallery.route.tsx.',
  },
  {
    id: 'playground-page-gallery',
    anchor: { kind: 'route' },
    routes: [RouteUrls.PlaygroundPageGallery],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On /playground click the "Page gallery" card', dockNavStep],
      },
    ],
    gate: 'playgroundLayout',
    flags: [],
    preconditions: {
      session: 'uninstalled',
      network: 'mainnet',
      mocks: [],
    },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Living area "Multisig pages in context": the Dashboard, Account, Vault, Create vault and Transaction detail pages reconstructed with mock data and the real presentational components, main column and sidebar stacked, plus a Modals frame where the passive modals open from buttons. Self-fetching pieces such as vault-card and account-row balances use stand-ins or stay blank; the invitation modal reads a vault detail the page seeds into the React Query cache on mount, and its buttons stay disabled without a session. Renders inside the app shell; 404s on the production deploy. Route module: pages/playground/areas/page-gallery/page-gallery.route.tsx.',
  },
  {
    id: 'playground-staking-states',
    anchor: { kind: 'route' },
    routes: [RouteUrls.PlaygroundStakingStates],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On /playground click the "Staking states" card', dockNavStep],
      },
    ],
    gate: 'playgroundLayout',
    flags: [],
    preconditions: {
      session: 'uninstalled',
      network: 'mainnet',
      mocks: [],
    },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Exploration area (issue #2550) "Bitcoin staking surfaces": every pox-5 staking screen in journey order (Discovery, Starting to stake, Bring your own signer manager, An active position, updates), each board in the states that change the design. Each board wraps the shipping components in a StakingSurface with its own seeded React Query client; the StakingPlaygroundShell sets React Query offline so no network reads happen and connects a mock wallet by setting mock addresses (with a "Disconnect" link), rendering the boards only once an address is set. Renders inside the app shell; 404s on the production deploy. Route module: pages/playground/areas/staking-states/staking-states.route.tsx.',
  },
  {
    id: 'playground-update-stake-switch',
    anchor: { kind: 'route' },
    routes: [RouteUrls.PlaygroundUpdateStakeSwitch],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['On /playground click the "Update stake: switch signer manager" card', dockNavStep],
      },
    ],
    gate: 'playgroundLayout',
    flags: [],
    preconditions: {
      session: 'uninstalled',
      network: 'mainnet',
      mocks: [],
    },
    selectors: {
      others: [],
    },
    actions: [],
    specs: [],
    description:
      'Exploration area (issue #2643) recording the design for switching signer managers through the update-stake form: an "Entry point" board with the Switch action on the pool table, "The update form" boards (switch armed to Fast Pool, a fee increase called out, the quiet unchanged state) and "Custom signer managers" boards. It reuses the StakingPlaygroundShell from the staking-states area, so reads are paused and a mock wallet is connected; the picker and summary card are the real components that ship in the live update flow. Renders inside the app shell; 404s on the production deploy. Route module: pages/playground/areas/update-stake-switch/update-stake-switch.route.tsx.',
  },
] as const satisfies readonly WebFeatureEntry[];
