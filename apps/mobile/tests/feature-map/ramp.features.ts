import { AppRoutes } from '@/shared/app-routes';
import { RampSelectors } from '@/shared/selectors/ramp.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlock = 'apps/mobile/maestro/shared/unlock.yaml';

export const rampFeatures = [
  {
    id: 'ramp-buy',
    anchor: { kind: 'selectors', objects: ['RampSelectors.WebView'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      { kind: 'nav', steps: ['On the home screen tap "Buy" in the account actions row'] },
      {
        kind: 'nav',
        steps: ['Open an asset from the home screen', 'Tap "Buy" on the token screen'],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_onramper_buy'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: RampSelectors.WebView, others: [] },
    actions: [],
    specs: [],
    description:
      'Full-height sheet with an Onramper widget web view in buy mode. "Buy" renders only while release_onramper_buy is on. The widget gets the native segwit address and the Stacks address of the current account, or only the address of the chain of the asset it was opened for, and redirects to the Leather portfolio on success or failure. The widget content is third-party and has no testIDs.',
  },
  {
    id: 'ramp-sell',
    anchor: { kind: 'selectors', objects: ['RampSelectors.WebView'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      { kind: 'nav', steps: ['On the home screen tap "Sell" in the account actions row'] },
      {
        kind: 'nav',
        steps: ['Open an asset from the home screen', 'Tap "Sell" on the token screen'],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_onramper_sell'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: RampSelectors.WebView, others: [] },
    actions: [],
    specs: [],
    description:
      'The same Onramper web view sheet in sell mode. "Sell" renders only while release_onramper_sell is on.',
  },
] as const satisfies readonly MobileFeatureEntry[];
