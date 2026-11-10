import { AppRoutes } from '@/shared/app-routes';
import { RampSelectors } from '@/shared/selectors/ramp.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const rampDescription =
  'The ramp sheet (features/ramp/ramp-sheet.tsx and ramp.tsx) loads the Onramper widget in a WebView with getOnramperIframeParams from @leather.io/features: the current theme, the account native segwit and Stacks addresses (only the chain of the asset when one is passed) and the success and failure redirect to the Leather portfolio. Everything inside the WebView is Onramper, not the app, and needs network access to the widget host from getOnramperEnv.';

export const rampFeatures = [
  {
    id: 'ramp-buy',
    anchor: { kind: 'selectors', objects: ['RampSelectors.Webview'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home with a wallet, tap the "Buy" action button (t`Buy` in components/action-buttons.tsx), or "Buy" on a token details screen or a deposit token cell',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_onramper_buy'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: RampSelectors.Webview, others: [] },
    actions: [],
    specs: [],
    description: `Buy mode: the button only shows when release_onramper_buy is on. ${rampDescription} No spec covers it.`,
  },
  {
    id: 'ramp-sell',
    anchor: { kind: 'selectors', objects: ['RampSelectors.Webview'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home with a wallet, tap the "Sell" action button (t`Sell` in components/action-buttons.tsx), or "Sell" on a token details screen',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_onramper_sell'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: RampSelectors.Webview, others: [] },
    actions: [],
    specs: [],
    description: `Sell mode: the button only shows when release_onramper_sell is on. ${rampDescription} No spec covers it.`,
  },
] as const satisfies readonly MobileFeatureEntry[];
