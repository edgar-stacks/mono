import { AppRoutes } from '@/shared/app-routes';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { SwapSelectors } from '@/shared/selectors/swap.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const openSwapSteps = [
  'With the swap flag on, tap "Swap" on Home (SharedSelectors.SwapButton) or on a token screen',
] as const;

export const swapFeatures = [
  {
    id: 'swap-form',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.FormScreen'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [...openSwapSteps] }],
    gate: 'splashScreen',
    flags: ['swap', 'swap_sbtc_bridging'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SwapSelectors.FormScreen, others: [SharedSelectors.SwapButton] },
    actions: [],
    specs: [],
    description:
      '"Swap" form (swap/screens/swap-form-screen.tsx) in the global swap sheet, mounted only when the swap flag is on. Base and target amount fields with "MAX" and "Flip assets", "Rate" and "Estimated fees", and "Review". Errors include "Insufficient balance", "No quotes available for this swap." and "Amount too small"; swap_sbtc_bridging decides which BTC/sBTC pairs are disabled (use-swap-disabled-pairs.ts).',
  },
  {
    id: 'swap-asset-selector',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.AssetSelector'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [...openSwapSteps, 'Tap the base or the target asset'] }],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SwapSelectors.AssetSelector, others: [] },
    actions: [],
    specs: [],
    description:
      'Asset picker sheet (asset-selector-sheet.tsx with asset-selector.tsx): "Search for asset", "Select", and the empty states "No assets found", "No swaps available" and "Unable to load assets".',
  },
  {
    id: 'swap-review',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.ReviewScreen'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [...openSwapSteps, 'Enter an amount and tap "Review"'] }],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SwapSelectors.ReviewScreen, others: [] },
    actions: [],
    specs: [],
    description:
      '"Review Swap" (swap/screens/swap-review-screen.tsx) with "Min. receive", "Slippage", "Price impact", "Make sure everything looks correct. Confirmed transactions cannot be undone." and "Confirm"; "No quotes available" or "Unable to load swap details" when the quote fails.',
  },
  {
    id: 'swap-submission-overlay',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.SubmissionOverlay'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [...openSwapSteps, 'Review the swap and tap "Confirm"'] }],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SwapSelectors.SubmissionOverlay, others: [] },
    actions: [],
    specs: [],
    description:
      'Overlay over the review (swap-submission-overlay.tsx): "Initiating the swap...", then "Swap initiated" or "Failed to start a swap" with "Swap wasn\'t submitted due to an unexpected error. Please try again, or …" and "Back to review".',
  },
  {
    id: 'swap-slippage-sheet',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.SlippageSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [...openSwapSteps, 'On the review tap "Slippage"'] }],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SwapSelectors.SlippageSheet, others: [] },
    actions: [],
    specs: [],
    description:
      '"Edit Slippage" sheet (slippage-selector-sheet.tsx): "Price moving against you past this percentage will cancel the swap." and "Update slippage".',
  },
  {
    id: 'swap-info-sheets',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.InfoSheet'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      { kind: 'nav', steps: [...openSwapSteps, 'Tap an info icon on the form or the review'] },
    ],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SwapSelectors.InfoSheet, others: [] },
    actions: [],
    specs: [],
    description:
      'Explanation sheets on info-sheet.tsx, all sharing SwapSelectors.InfoSheet: "Fees", "Price impact", "Minimum receive" and "Slippage tolerance".',
  },
] as const satisfies readonly MobileFeatureEntry[];
