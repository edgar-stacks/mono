import { AppRoutes } from '@/shared/app-routes';
import { RampSelectors } from '@/shared/selectors/ramp.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

export const rampFeatures = [
  {
    id: 'ramp-buy',
    anchor: { kind: 'selectors', objects: ['RampSelectors.WebView'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'With release_onramper_buy on, tap "Buy" on Home (SharedSelectors.BuyButton) or on a token screen',
          'Or tap "Buy" on the Bitcoin or Stacks deposit cell, which is not behind the flag',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_onramper_buy'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: RampSelectors.WebView, others: [SharedSelectors.BuyButton] },
    actions: [],
    specs: [],
    description:
      'Global ramp sheet (ramp-sheet.tsx) in buy mode: a full-height WebView (ramp.tsx, RampSelectors.WebView) with the Onramper widget and the wallet addresses; all text is the third-party page.',
  },
  {
    id: 'ramp-sell',
    anchor: { kind: 'selectors', objects: ['RampSelectors.WebView'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['With release_onramper_sell on, tap "Sell" on Home (SharedSelectors.SellButton)'],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_onramper_sell'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: RampSelectors.WebView, others: [SharedSelectors.SellButton] },
    actions: [],
    specs: [],
    description:
      'The ramp sheet in sell mode: the same Onramper WebView (RampSelectors.WebView) opened with the sell parameters.',
  },
] as const satisfies readonly MobileFeatureEntry[];
