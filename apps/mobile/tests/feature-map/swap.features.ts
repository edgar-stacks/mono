import { AppRoutes } from '@/shared/app-routes';
import { SwapSelectors } from '@/shared/selectors/swap.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const openSwap = 'On Home tap "Swap" in the account action buttons';
const openReview = 'Enter an amount, pick a target asset and tap t`Review`';

export const swapFeatures = [
  {
    id: 'swap-form',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.ReviewButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      { kind: 'nav', steps: [openSwap] },
      { kind: 'nav', steps: ['On a token details screen tap "Swap"'] },
    ],
    gate: 'splashScreen',
    flags: ['swap', 'swap_sbtc_bridging'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SwapSelectors.ReviewButton,
      others: [
        SwapSelectors.BaseAssetToggle,
        SwapSelectors.TargetAssetToggle,
        SwapSelectors.QuotePreview,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Swap sheet form (apps/mobile/src/features/swap/screens/swap-form-screen.tsx) titled t`Swap`, mounted only when the swap flag is on (app/_layout.tsx). A pay card with the amount and the base asset toggle (STX by default), a receive card with the target estimate and target toggle, a flip button, the quote preview, 25%/50%/75%/t`MAX` presets, a numpad and t`Review`, enabled once the quote is valid. swap_sbtc_bridging allows the BTC to sBTC pair (use-swap-disabled-pairs.ts).',
  },
  {
    id: 'swap-asset-selector',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.AssetSelector'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: [openSwap, 'Tap the pay or receive asset toggle'] }],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SwapSelectors.AssetSelector,
      others: [SwapSelectors.BaseAssetToggle, SwapSelectors.TargetAssetToggle],
    },
    actions: [],
    specs: [],
    description:
      'Asset selector sheet (apps/mobile/src/features/swap/components/asset-selector/asset-selector-sheet.tsx, asset-selector.tsx) with a t`Search for asset` field and the swappable assets for the pay or receive side, plus loading, error and empty states. The receive toggle is disabled until a pay asset is set.',
  },
  {
    id: 'swap-review',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.ReviewContent'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: [openSwap, openReview] }],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SwapSelectors.ReviewContent,
      others: [SwapSelectors.ConfirmButton],
    },
    actions: [],
    specs: [],
    description:
      'Review step titled t`Review Swap` (apps/mobile/src/features/swap/screens/swap-review-screen.tsx): the summary, account, t`Rate` with a refetch indicator, t`Min. receive`, t`Slippage`, t`Price impact` above the warning threshold and t`Estimated fees`, then t`Confirm`. Confirming shows the submission overlay and closes the sheet on success. Loading, error and empty quote states replace the content.',
  },
  {
    id: 'swap-slippage-selector',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.SlippageSelector'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: [openSwap, openReview, 'Tap the slippage value on the review'] }],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SwapSelectors.SlippageSelector,
      others: [SwapSelectors.UpdateSlippageButton],
    },
    actions: [],
    specs: [],
    description:
      'Sheet titled t`Edit Slippage` (apps/mobile/src/features/swap/components/slippage-selector/slippage-selector-sheet.tsx) explaining t`Price moving against you past this percentage will cancel the swap.` with a numeric stepper (t`Decrease slippage` / t`Increase slippage`) and t`Update slippage`. Only reachable for quotes where slippage applies.',
  },
  {
    id: 'swap-fees-info',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.FeesInfoSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      { kind: 'nav', steps: [openSwap, openReview, 'Tap the info button on t`Estimated fees`'] },
    ],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SwapSelectors.FeesInfoSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Info sheet titled t`Fees` (apps/mobile/src/features/swap/components/fees-info-sheet.tsx) listing t`Network fee` and, when the provider charges one, the provider fee (Bitflow, ALEX, Velar or sBTC Bridge) in crypto and quote currency.',
  },
  {
    id: 'swap-min-receive-info',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.MinReceiveInfoSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      { kind: 'nav', steps: [openSwap, openReview, 'Tap the info button on t`Min. receive`'] },
    ],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SwapSelectors.MinReceiveInfoSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Info sheet titled t`Minimum receive` (apps/mobile/src/features/swap/components/min-receive-info-sheet.tsx) explaining the guaranteed minimum amount based on the slippage tolerance. Only shown when the quote has a minimum receive.',
  },
  {
    id: 'swap-price-impact-info',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.PriceImpactInfoSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      { kind: 'nav', steps: [openSwap, openReview, 'Tap the info button on t`Price impact`'] },
    ],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SwapSelectors.PriceImpactInfoSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Info sheet (apps/mobile/src/features/swap/components/price-impact-info-sheet.tsx) explaining the difference between the market price and the received price. The row only appears when the price impact reaches PRICE_IMPACT_WARNING_THRESHOLD, so it needs a large trade.',
  },
  {
    id: 'swap-slippage-info',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.SlippageInfoSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: [openSwap, openReview, 'Tap the info button on t`Slippage`'] }],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SwapSelectors.SlippageInfoSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Info sheet titled t`Slippage tolerance` (apps/mobile/src/features/swap/components/slippage-info-sheet.tsx) explaining the maximum price change accepted before the swap reverts.',
  },
] as const satisfies readonly MobileFeatureEntry[];
