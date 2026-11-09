import { BitcoinStakingSelectors } from '@tests/selectors/bitcoin-staking.selectors';
import { RouteUrls } from '~/route-urls';

import type { WebFeatureEntry } from './web-feature-entry';

const bitcoinStakingSpec = 'apps/web/tests/bitcoin-staking.spec.ts';

export const stakingFeatures = [
  {
    id: 'staking-overview',
    anchor: { kind: 'route' },
    routes: [RouteUrls.Staking],
    params: [],
    entry: [
      { kind: 'deepLink', steps: ['Open /staking'] },
      { kind: 'nav', steps: ['Open /, which redirects to /staking'] },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: {
      ready: BitcoinStakingSelectors.ByosmEntryLink,
      others: [
        BitcoinStakingSelectors.StartStakingButton,
        BitcoinStakingSelectors.PoolTvl,
        BitcoinStakingSelectors.PoolTvlUsd,
        BitcoinStakingSelectors.StakingUserPosition,
        BitcoinStakingSelectors.LiquidStartEarning,
        BitcoinStakingSelectors.BondPool,
      ],
    },
    actions: [],
    open: [],
    specs: [bitcoinStakingSpec],
    description:
      'The Bitcoin Staking landing page (staking.tsx): a top section with the connected position (StakingUserPosition, "View position"), the Stacks staking pool table with per-pool total staked and "Start staking" buttons plus the bring-your-own signer manager link (staking-provider-table.tsx), the liquid stacking and bond pool tables, the dual stacking transition card and an FAQ. Without a wallet, "Start staking" opens the install dialog. The spec drives the pool totals with the leather-mock-pox5-delegated-low flag and an unlisted position with leather-mock-pox5-staked-custom.',
  },
  {
    id: 'staking-status',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingStatus],
    params: [],
    entry: [{ kind: 'deepLink', steps: ['Open /staking/status'] }],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: { others: [] },
    actions: [],
    open: [],
    specs: [bitcoinStakingSpec],
    description:
      "Pool-agnostic resolver for support links (staking-status.route.tsx): without a connected account it asks the user to connect; with an active position it redirects to the pool's active page, or to /staking/pool/byosm/active?contract=… for an unlisted signer manager; otherwise it redirects to /staking. The spec sets leather-mock-pox5-staked or leather-mock-pox5-staked-custom to reach each redirect.",
  },
  {
    id: 'staking-byosm',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingByosm],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open /staking', 'Click the bring-your-own signer manager link (byosm-entry-link)'],
      },
      { kind: 'deepLink', steps: ['Open /staking/pool/byosm?contract=<address.contract-name>'] },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: {
      ready: BitcoinStakingSelectors.ByosmContractInput,
      others: [BitcoinStakingSelectors.ByosmContractContinue],
    },
    actions: [],
    open: [],
    specs: [bitcoinStakingSpec],
    description:
      'Stake with a custom signer-manager contract (byosm-staking.tsx, client-only). The contract entry form rejects malformed principals ("Enter a contract principal in address.contract-name format."); a valid contract shows the start-staking form under ?contract=, a listed signer manager redirects to its pool page and an active position redirects to its active page. The spec uses the mock custom signer manager contract and leather-mock-pox5-staked-custom.',
  },
  {
    id: 'staking-pool',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingPool],
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      { kind: 'nav', steps: ['Open /staking', 'Click "Start staking" for a pool'] },
      { kind: 'deepLink', steps: ['Open /staking/pool/stacking-dao'] },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: {
      ready: BitcoinStakingSelectors.StakingAcknowledgmentCheckbox,
      others: [
        BitcoinStakingSelectors.ConfirmationStakeButton,
        BitcoinStakingSelectors.PoolTotalStaked,
        BitcoinStakingSelectors.PoolHealthWarning,
        BitcoinStakingSelectors.PreparePhaseCallout,
        BitcoinStakingSelectors.Pox5SubmitError,
      ],
    },
    actions: [],
    open: [],
    specs: [bitcoinStakingSpec],
    description:
      'Start-staking form for a listed pool (pool-staking.route.tsx, start-staking.tsx): the pool overview with total staked and health warning, an amount field ("Amount of STX to stake"), a duration field ("Staking duration (1–96 cycles)"), the acknowledgment checkbox and the stake button, which sends stx_callContract to the wallet. The loader 404s an unknown slug; an active position redirects to /active and a pending stake shows the pending panel. The spec funds the account with leather-mock-stx-balance and drives the prepare phase with leather-mock-burn-height and the result with leather-mock-pox5-tx-status.',
  },
  {
    id: 'staking-pool-active',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingPoolActive],
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      {
        kind: 'nav',
        steps: ['With an active position, open /staking/pool/stacking-dao, which redirects here'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: {
      ready: BitcoinStakingSelectors.ClaimableRewardsCard,
      others: [
        BitcoinStakingSelectors.ClaimRewardsButton,
        BitcoinStakingSelectors.UnstakeButton,
        BitcoinStakingSelectors.UpdateStakeButton,
        BitcoinStakingSelectors.ActivePoolTvl,
        BitcoinStakingSelectors.ActivePoolTvlUsd,
      ],
    },
    actions: [],
    open: [],
    specs: [bitcoinStakingSpec],
    description:
      'The active position (staking-active-info.tsx): claimable rewards card with "Claim rewards", the position grid with pool TVL, and unstake and update buttons. Without a connected account it redirects to /staking, with no position to the pool page, and with a position at another pool to that pool\'s /active (byosm positions use ?contract=). A direct full-page load can bounce before the persisted connection hydrates, so the spec arrives through the pool page with leather-mock-pox5-staked set.',
  },
  {
    id: 'staking-pool-update',
    anchor: { kind: 'route' },
    routes: [RouteUrls.StakingPoolUpdate],
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      {
        kind: 'nav',
        steps: ['On the active position page click "Update stake" (update-stake-button)'],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: {
      ready: BitcoinStakingSelectors.ConfirmUpdateStakeButton,
      others: [
        BitcoinStakingSelectors.SignerManagerOption,
        BitcoinStakingSelectors.CustomSignerManagerInput,
        BitcoinStakingSelectors.CustomSignerManagerValidate,
      ],
    },
    actions: [],
    open: [],
    specs: [],
    description:
      "Update an active stake (update-staking.tsx): change the amount or duration, or switch signer manager (choose-signer-manager.tsx, a ?to=<slug> target or a custom contract), with a sidebar summary and confirm button. Without an active position it redirects to the pool page; a position at another pool redirects to that pool's /update. No spec covers it; reach it with leather-mock-pox5-staked set.",
  },
  {
    id: 'pox5-tx-status-screen',
    anchor: { kind: 'selectors', objects: ['BitcoinStakingSelectors.Pox5TxStatusScreen'] },
    routes: [],
    startRoute: RouteUrls.StakingPool,
    params: [{ name: 'slug', example: 'stacking-dao' }],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On /staking/pool/stacking-dao fill the amount and duration, check the acknowledgment and click stake',
          'Resolve the mock wallet request',
        ],
      },
    ],
    gate: 'none',
    flags: [],
    preconditions: { session: 'mock-connected', network: 'mainnet', mocks: ['successHandlers'] },
    selectors: {
      ready: BitcoinStakingSelectors.Pox5TxStatusScreen,
      others: [
        BitcoinStakingSelectors.Pox5TxStatusFailed,
        BitcoinStakingSelectors.Pox5TxDismissButton,
        BitcoinStakingSelectors.Pox5TxExplorerLink,
      ],
    },
    actions: [],
    open: [],
    specs: [bitcoinStakingSpec],
    description:
      'While a staking transaction is tracked, the staking layout (Pox5TxTrackerProvider in bitcoin-staking.layout.tsx) replaces the page with this confirming screen without changing the URL; on confirmation it toasts and navigates to the tracked destination, and on failure it shows the failed state with "Dismiss" and an explorer link (pox5-tx-status-screen.tsx). The spec holds it with leather-mock-pox5-tx-status=pending and fails it with abort_by_post_condition.',
  },
] as const satisfies readonly WebFeatureEntry[];
