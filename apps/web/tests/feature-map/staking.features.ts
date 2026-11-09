import { BitcoinStakingSelectors } from '@tests/selectors/bitcoin-staking.selectors';
import { RouteUrls } from '~/route-urls';

import type { WebFeatureEntry } from './web-feature-entry';

const stakingSpec = 'apps/web/tests/bitcoin-staking.spec.ts';

const defaultMocks = ['successHandlers'] as const;

export const stakingFeatures = [
  {
    id: 'staking-overview',
    anchor: { kind: 'route' },
    routes: [RouteUrls.Staking],
    params: [],
    entry: [
      { kind: 'deepLink', steps: ['Open /staking'] },
      {
        kind: 'nav',
        steps: [
          'Open /staking/status while connected with no active position; it redirects to /staking',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: [...defaultMocks] },
    selectors: {
      others: [
        BitcoinStakingSelectors.StartStakingButton,
        BitcoinStakingSelectors.SwitchPoolButton,
        BitcoinStakingSelectors.PoolTvl,
        BitcoinStakingSelectors.PoolTvlUsd,
        BitcoinStakingSelectors.ByosmEntryLink,
        BitcoinStakingSelectors.StakingUserPosition,
        BitcoinStakingSelectors.NeedsRestakeBanner,
        BitcoinStakingSelectors.StakingScanIndicator,
        BitcoinStakingSelectors.LiquidStartEarningButton,
        BitcoinStakingSelectors.DirectBondEntryLink,
        BitcoinStakingSelectors.DualStackingTransitionLink,
        BitcoinStakingSelectors.StakingPoolAvatarFallback,
      ],
    },
    actions: [],
    specs: [stakingSpec],
    description:
      'Bitcoin Staking (PoX-5) landing page (pages/bitcoin-staking/staking.route.tsx rendering staking.tsx). It lists the Stacks staking pools with their total staked per pool (BitcoinStakingSelectors.PoolTvl, summed across each pool\'s signer-manager contracts) and a start-staking button per pool, a "bring your own signer manager" entry link to /staking/pool/byosm, liquid stacking providers, bond pools, a dual-stacking transition link and an FAQ. When connected, the top section is replaced by the user\'s position (BitcoinStakingSelectors.StakingUserPosition, from usePox5Position) once the scan finishes, with a "View position" link to the active page; the scan progress shows next to the header (StakingScanIndicator). The spec sets leather-mock-stx-balance for a funded account, leather-mock-pox5-staked-custom to show an unlisted (byosm) position, and asserts the pool totals from the mocked delegated amounts.',
  },
  {
    id: 'staking-status',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingStatus],
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Open /staking/status'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: [...defaultMocks] },
    selectors: { others: [] },
    actions: [],
    specs: [stakingSpec],
    description:
      'Pool-agnostic "Your staking" resolver (pages/bitcoin-staking/staking-status.route.tsx) that support can link to without knowing the pool. Without a connected Stacks account it shows a connect prompt; otherwise it waits for usePox5Position and redirects: an active position in a listed pool goes to /staking/pool/:slug/active, an active position with a custom signer manager goes to /staking/pool/byosm/active?contract=..., and pending or absent positions go to /staking. The spec covers the listed case with leather-mock-pox5-staked, the byosm case with leather-mock-pox5-staked-custom, and the no-position fallback with no flag.',
  },
  {
    id: 'staking-byosm',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingByosm],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open /staking',
          'Click the bring-your-own-signer-manager link (BitcoinStakingSelectors.ByosmEntryLink)',
        ],
      },
      {
        kind: 'deepLink',
        steps: ['Open /staking/pool/byosm, optionally with ?contract=<signer manager contract id>'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: [...defaultMocks] },
    selectors: {
      ready: BitcoinStakingSelectors.ByosmContractInput,
      others: [BitcoinStakingSelectors.ByosmContractContinue],
    },
    actions: [],
    specs: [stakingSpec],
    description:
      'Client-only page for staking with a custom signer-manager contract (pages/bitcoin-staking/pool/byosm-staking.route.tsx rendering features/bitcoin-staking/byosm/byosm-staking.tsx). Without a valid ?contract= it shows a contract-principal entry form (ByosmContractInput, ByosmContractContinue) that rejects malformed principals with "Enter a contract principal in address.contract-name format."; a valid unlisted contract renders the same start-staking form as the pool page with that signer manager, and a contract belonging to a listed pool redirects to /staking/pool/:slug. An existing active position redirects to its active page. The spec sets leather-mock-stx-balance and, after submitting, leather-mock-pox5-staked-custom so the tracked transaction lands on /staking/pool/byosm/active.',
  },
  {
    id: 'staking-pool',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingPool],
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open /staking',
          'Click the start-staking button for a pool (BitcoinStakingSelectors.StartStakingButton with the pool slug)',
        ],
      },
      { kind: 'deepLink', steps: ['Open /staking/pool/stacking-dao'] },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: [...defaultMocks] },
    selectors: {
      others: [
        BitcoinStakingSelectors.PoolTotalStaked,
        BitcoinStakingSelectors.PoolHealthWarning,
        BitcoinStakingSelectors.PoolFeeSource,
        BitcoinStakingSelectors.PoolMinStake,
        BitcoinStakingSelectors.CycleStatusOpen,
        BitcoinStakingSelectors.CycleStatusPaused,
        BitcoinStakingSelectors.PayoutOption,
        BitcoinStakingSelectors.BtcOnlyPayout,
        BitcoinStakingSelectors.PayoutAddressChanged,
        BitcoinStakingSelectors.PendingStakePanel,
      ],
    },
    actions: [],
    specs: [stakingSpec],
    description:
      'Start-staking form for a listed pool (pages/bitcoin-staking/pool/pool-staking.route.tsx rendering features/bitcoin-staking/start-staking/start-staking.tsx); the loader 404s on an unknown slug. It shows the pool overview with total staked across its signer managers (PoolTotalStaked) and cycle status, a pool health warning when the total is low, and form fields for amount ("Amount of STX to stake"), duration ("Staking duration (1–96 cycles)") and rewards payout, with the confirmation panel beside it. Without a connected account it shows "You need to connect Leather"; an active position redirects to /staking/pool/:slug/active and a pending one shows PendingStakePanel. The spec sets leather-mock-stx-balance for a funded balance, leather-mock-pox5-delegated-low to trigger the health warning, and checks the amount and cycle validation messages.',
  },
  {
    id: 'staking-pool-active',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingPoolActive],
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set leather-mock-pox5-staked to true in localStorage',
          'Open /staking/pool/stacking-dao; the active position redirects to /staking/pool/stacking-dao/active',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: [...defaultMocks] },
    selectors: {
      others: [
        BitcoinStakingSelectors.ActivePoolTvl,
        BitcoinStakingSelectors.ActivePoolTvlUsd,
        BitcoinStakingSelectors.UnstakeButton,
        BitcoinStakingSelectors.UpdateStakeButton,
        BitcoinStakingSelectors.OperatorPayoutCard,
        BitcoinStakingSelectors.OperatorPayoutLink,
        BitcoinStakingSelectors.OperatorPayoutAddress,
        BitcoinStakingSelectors.StakingPositionClaimRewards,
      ],
    },
    actions: [],
    specs: [stakingSpec],
    description:
      '"Your staking" page for an active position (pages/bitcoin-staking/pool/pool-staking-active.route.tsx rendering features/bitcoin-staking/staking-active/staking-active-info.tsx). It shows either the claimable sBTC rewards card or, for pools with an operator BTC payout, the operator payout card, then the position grid with pool total staked (ActivePoolTvl) and Unstake and Update stake buttons. With no position it redirects to /staking/pool/:slug, a position in another pool redirects to that pool\'s active page (byosm positions carry ?contract=), and a pending stake shows PendingStakePanel. A direct full-page load before the persisted connection hydrates redirects to /staking, so the spec reaches it via /staking/pool/stacking-dao with leather-mock-pox5-staked (or leather-mock-pox5-staked-custom for byosm).',
  },
  {
    id: 'staking-pool-update',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingPoolUpdate],
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set leather-mock-pox5-staked to true in localStorage',
          'Open /staking/pool/stacking-dao; it redirects to the active page',
          'Click Update stake (BitcoinStakingSelectors.UpdateStakeButton)',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: [...defaultMocks] },
    selectors: {
      others: [
        BitcoinStakingSelectors.ConfirmUpdateStakeButton,
        BitcoinStakingSelectors.SignerManagerOption,
        BitcoinStakingSelectors.CustomSignerManagerInput,
        BitcoinStakingSelectors.CustomSignerManagerValidate,
        BitcoinStakingSelectors.StakingAcknowledgmentCheckbox,
      ],
    },
    actions: [],
    specs: [],
    description:
      "Update-staking form for an active position (pages/bitcoin-staking/pool/pool-staking-update.route.tsx rendering features/bitcoin-staking/update-staking/update-staking.tsx). It lets the user extend cycles, increase the amount, edit the payout preference and switch to another listed signer manager or a custom contract (SignerManagerOption, CustomSignerManagerInput), then confirm with ConfirmUpdateStakeButton after the acknowledgment; confirm is disabled during the prepare phase. A ?to=<slug> search param preselects a switch target. Without an active position it redirects to /staking/pool/:slug, and a position in another pool redirects to that pool's update page. No E2E spec covers this page; leather-mock-pox5-staked provides the position in mock mode.",
  },
  {
    id: 'staking-pox5-tx-status',
    anchor: { kind: 'selectors', objects: ['BitcoinStakingSelectors.Pox5TxStatusScreen'] },
    routes: [],
    startRoute: RouteUrls.StakingPool,
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set leather-mock-stx-balance and leather-mock-pox5-tx-status=pending in localStorage',
          'Open /staking/pool/stacking-dao, fill amount and cycles, check the acknowledgment and click ConfirmationStakeButton',
          'Click Resolve in the mock wallet dialog',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: [...defaultMocks] },
    selectors: {
      ready: BitcoinStakingSelectors.Pox5TxStatusScreen,
      others: [
        BitcoinStakingSelectors.Pox5TxStatusFailed,
        BitcoinStakingSelectors.Pox5TxDismissButton,
        BitcoinStakingSelectors.Pox5TxExplorerLink,
      ],
    },
    actions: [],
    specs: [stakingSpec],
    description:
      'Transaction status screen that replaces the whole staking layout while a broadcast PoX-5 transaction (stake, stake update, unstake or claim rewards) is tracked (features/bitcoin-staking/components/pox5-tx-tracker-provider.tsx and pox5-tx-status-screen.tsx, mounted by pages/bitcoin-staking/bitcoin-staking.layout.tsx); the URL does not change. It polls the transaction and shows a pending spinner with an explorer link; on confirmation it invalidates the pox-5 queries, toasts and navigates to the tracked destination, and on failure it shows Pox5TxStatusFailed with a Dismiss button that returns to the form. The spec drives the state with leather-mock-pox5-tx-status (pending, success, abort_by_post_condition) and sets leather-mock-pox5-staked before switching to success.',
  },
  {
    id: 'staking-claimable-rewards',
    anchor: { kind: 'selectors', objects: ['BitcoinStakingSelectors.ClaimableRewardsCard'] },
    routes: [],
    startRoute: RouteUrls.StakingPoolActive,
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set leather-mock-pox5-staked to true in localStorage',
          'Open /staking/pool/stacking-dao; it redirects to /staking/pool/stacking-dao/active',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: [...defaultMocks] },
    selectors: {
      ready: BitcoinStakingSelectors.ClaimableRewardsCard,
      others: [
        BitcoinStakingSelectors.ClaimRewardsButton,
        BitcoinStakingSelectors.ToggleRewardsHistory,
        BitcoinStakingSelectors.RewardsHistory,
        BitcoinStakingSelectors.Pox5SubmitError,
      ],
    },
    actions: [],
    specs: [stakingSpec],
    description:
      'Claimable sBTC rewards card on the active staking page for pools without an operator BTC payout (features/bitcoin-staking/staking-active/components/claimable-rewards-card.tsx). It shows the total earned sBTC, a Claim rewards button that claims the oldest unclaimed cycle (disabled while loading or with nothing to claim) and, when per-cycle history exists, a Show/Hide history toggle listing earnings per cycle. A broadcast claim is tracked on the transaction status screen without a destination; wallet errors render Pox5SubmitError inside the card. The spec uses leather-mock-pox5-staked, clicks Claim rewards, resolves the mock wallet dialog and expects a "Rewards claimed" toast.',
  },
  {
    id: 'staking-confirmation',
    anchor: {
      kind: 'selectors',
      objects: [
        'BitcoinStakingSelectors.StakingAcknowledgmentCheckbox',
        'BitcoinStakingSelectors.ConfirmationStakeButton',
      ],
    },
    routes: [],
    startRoute: RouteUrls.StakingPool,
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Set leather-mock-stx-balance in localStorage',
          'Open /staking/pool/stacking-dao and fill the amount and cycles',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: [...defaultMocks] },
    selectors: {
      ready: BitcoinStakingSelectors.StakingAcknowledgmentCheckbox,
      others: [
        BitcoinStakingSelectors.ConfirmationStakeButton,
        BitcoinStakingSelectors.PreparePhaseCallout,
        BitcoinStakingSelectors.Pox5SubmitError,
      ],
    },
    actions: [],
    specs: [stakingSpec],
    description:
      'Confirmation step of the start-staking form, shown in the side panel on wide screens and in the Review drawer on narrow ones (features/bitcoin-staking/start-staking/components/staking-confirmation-steps.tsx and components/staking-acknowledgment.tsx). It summarises the amount and cycles, shows lock and payout terms with an acknowledgment checkbox that must be checked before the Confirm button submits (otherwise it shakes and shows a required message), and renders PreparePhaseCallout above it during the prepare phase, when the button is disabled. Wallet rejections and other submit failures render Pox5SubmitError below it without navigating. The spec sets leather-mock-stx-balance, uses leather-mock-burn-height=907460 to enter the prepare phase, and clicks Reject in the mock wallet dialog for the error.',
  },
] as const satisfies readonly WebFeatureEntry[];
