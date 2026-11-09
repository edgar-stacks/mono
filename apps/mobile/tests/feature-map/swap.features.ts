import { AppRoutes } from '@/shared/app-routes';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';
import { SwapSelectors } from '@/shared/selectors/swap.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlock = 'apps/mobile/maestro/shared/unlock.yaml';
const openSwapSheetStep =
  'On the home screen tap "Swap" in the account actions row (it renders only when the swap flag is on)';

export const swapFeatures = [
  {
    id: 'swap-form',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.BaseAssetToggle'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      { kind: 'nav', steps: [openSwapSheetStep] },
      {
        kind: 'nav',
        steps: ['Open an asset from the home screen', 'Tap "Swap" on the token screen'],
      },
    ],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SwapSelectors.BaseAssetToggle,
      others: [SwapSelectors.TargetAssetToggle, SwapSelectors.ReviewButton],
    },
    actions: [],
    specs: [],
    description:
      'Full-height sheet titled "Swap", rendered in the root layout only while the swap flag is on. The pay card holds the amount and the base asset toggle (Stacks by default, or the asset of the token screen); the receive card holds the estimated amount and the target toggle ("Select" until chosen, disabled without a base asset). A "Flip assets" button (`swapFlipButton`) shows when flipping is allowed. Below are the quote preview ("Rate", "Estimated fees", or "No quotes available for this swap." / "Unable to load the quote"), the "MAX" amount presets, a numpad and "Review", disabled until the swap can be submitted.',
  },
  {
    id: 'swap-asset-selector',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.AssetSelectorList'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [{ kind: 'nav', steps: [openSwapSheetStep, 'Tap the base or target asset toggle'] }],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SwapSelectors.AssetSelectorList, others: [] },
    actions: [],
    specs: [],
    description:
      'Asset selector sheet over the swap form with a "Search for asset" field and the swappable assets with their balances. Selecting an asset sets the base or target side and closes the sheet.',
  },
  {
    id: 'swap-review',
    anchor: { kind: 'selectors', objects: ['SwapSelectors.ReviewConfirmButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSwapSheetStep, 'Pick a target asset', 'Enter an amount', 'Tap "Review"'],
      },
    ],
    gate: 'splashScreen',
    flags: ['swap'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SwapSelectors.ReviewConfirmButton,
      others: [SharedSelectors.BackButton],
    },
    actions: [],
    specs: [],
    description:
      'Swap review titled "Review Swap" with a back button to the form. It shows the summary, the account, "Rate", "Min. receive", "Slippage" (tapping opens the slippage selector), "Price impact" and "Estimated fees", the note "Make sure everything looks correct.\\nConfirmed transactions cannot be undone." and "Confirm". Confirming shows an overlay with "Initiating the swap...", then "Swap initiated" and closes the sheet, or "Failed to start a swap" with "Back to review". Without quotes it shows "No quotes available" with "Go back"; on error "Unable to load swap details" with "Retry".',
  },
  {
    id: 'swap-sbtc-bridging',
    anchor: { kind: 'behavior' },
    routes: [],
    params: [],
    entry: [
      { kind: 'nav', steps: [openSwapSheetStep, 'Choose Bitcoin or sBTC as the base asset'] },
    ],
    gate: 'none',
    flags: ['swap', 'swap_sbtc_bridging'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { others: [] },
    actions: [],
    specs: [],
    description:
      'While swap_sbtc_bridging is off, the swap form disables every pair with Bitcoin as the base asset and sBTC to Bitcoin on mainnet and testnet. With it on no pair is disabled, so Bitcoin deposits into sBTC and sBTC withdraws to Bitcoin, and the quote preview can show "Amount too small", "Amount too large" or "Deposit cap reached" with "Depositing" or "Withdrawing".',
  },
] as const satisfies readonly MobileFeatureEntry[];
