import { AppRoutes } from '@/shared/app-routes';
import { RampSelectors } from '@/shared/selectors/ramp.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

export const rampFeatures = [
  {
    id: 'ramp-buy',
    anchor: { kind: 'selectors', objects: ['RampSelectors.WebView'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      { kind: 'nav', steps: ['On Home tap "Buy" in the account action buttons'] },
      { kind: 'nav', steps: ['On a token details screen tap "Buy"'] },
    ],
    gate: 'splashScreen',
    flags: ['release_onramper_buy'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: RampSelectors.WebView, others: [] },
    actions: [],
    specs: [],
    description:
      "Full-height ramp sheet (apps/mobile/src/features/ramp/ramp-sheet.tsx, ramp.tsx) in buy mode: a WebView on the Onramper widget with the account's native SegWit and Stacks addresses (only the asset's chain when opened from a token) and the current theme. The Buy button only shows when release_onramper_buy is on. The widget is a third-party page; its content is not under test.",
  },
  {
    id: 'ramp-sell',
    anchor: { kind: 'selectors', objects: ['RampSelectors.WebView'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      { kind: 'nav', steps: ['On Home tap "Sell" in the account action buttons'] },
      { kind: 'nav', steps: ['On a token details screen tap "Sell"'] },
    ],
    gate: 'splashScreen',
    flags: ['release_onramper_sell'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: RampSelectors.WebView, others: [] },
    actions: [],
    specs: [],
    description:
      'The same ramp sheet (apps/mobile/src/features/ramp/ramp.tsx) in sell mode, shown when release_onramper_sell is on. The Onramper widget opens on its sell flow.',
  },
] as const satisfies readonly MobileFeatureEntry[];
