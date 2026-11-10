import { AppRoutes } from '@/shared/app-routes';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { SwapSelectors } from '@/shared/selectors/swap.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const openSwap =
  'On Home with a wallet, tap the "Swap" action button (t`Swap` in components/action-buttons.tsx), or "Swap" on a token details screen to preselect the base asset';

export const swapFeatures = [
  {
    id: 'swap-form',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.ReviewButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [openSwap] }],
    gate: 'splashScreen',
    flags: ['swap', 'swap_sbtc_bridging'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SwapSelectors.ReviewButton,
      others: [SwapSelectors.BaseAssetToggle, SwapSelectors.TargetAssetToggle],
    },
    actions: [],
    specs: [],
    description:
      'The swap form (features/swap/screens/swap-form-screen.tsx, title t`Swap`) in the swap sheet, which _layout.tsx only mounts when the swap flag is on; the base asset defaults to STX (swap.tsx). A pay card and a receive card each have an amount and an asset toggle (t`Select` until chosen), a flip button, a quote preview, percentage presets, a numpad and t`Review`, enabled when the swap state allows submitting. Without swap_sbtc_bridging, BTC as base and sBTC to BTC are disabled pairs (use-swap-disabled-pairs.ts). No spec covers it.',
  },
  {
    id: 'swap-asset-selector',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.AssetSelector'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          openSwap,
          'Tap the pay or receive asset toggle (SwapSelectors.BaseAssetToggle or SwapSelectors.TargetAssetToggle)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['swap', 'swap_sbtc_bridging'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SwapSelectors.AssetSelector, others: [] },
    actions: [],
    specs: [],
    description:
      'The asset selector sheet (features/swap/components/asset-selector/asset-selector.tsx) with a t`Search for asset` input and a list of swappable assets with balances, or loading, error and empty states. The receive toggle is disabled until a pay asset is set. No spec covers it.',
  },
  {
    id: 'swap-review',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.Review'] },
    routes: [],
    startRoute: AppRoutes.Home,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          openSwap,
          'Choose both assets and an amount, then tap t`Review` (SwapSelectors.ReviewButton)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SwapSelectors.Review,
      others: [SwapSelectors.ConfirmButton, SharedSelectors.BackButton],
    },
    actions: [],
    specs: [],
    description:
      'The review screen (features/swap/screens/swap-review-screen.tsx, title t`Review Swap`) with a summary, the account, t`Rate` with a refetch indicator, t`Min. receive`, t`Slippage`, t`Price impact` above the warning threshold and t`Estimated fees`. t`Confirm` submits after a short tap guard, shows the submission overlay and dismisses the sheet on success. Loading, error and empty estimates show their own states instead of the review. No spec covers it.',
  },
  {
    id: 'swap-slippage-sheet',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.UpdateSlippageButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Open the swap review screen', 'Tap the slippage value in the t`Slippage` row'],
      },
    ],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SwapSelectors.UpdateSlippageButton, others: [] },
    actions: [],
    specs: [],
    description:
      'The t`Edit Slippage` sheet (features/swap/components/slippage-selector/slippage-selector-sheet.tsx) with a numeric stepper between the min and max slippage and t`Update slippage`, which saves to the swap state. The row only shows for quotes where slippage applies. No spec covers it.',
  },
] as const satisfies readonly MobileFeatureEntry[];
