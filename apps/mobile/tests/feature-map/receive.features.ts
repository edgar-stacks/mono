import { AppRoutes } from '@/shared/app-routes';
import { ReceiveSelectors } from '@/shared/selectors/receive.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

export const receiveFeatures = [
  {
    id: 'receive-select-asset',
    anchor: { kind: 'selectors', objects: ['ReceiveSelectors.AssetItem'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home with a wallet, tap the "Receive" action button (t`Receive` in components/action-buttons.tsx)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: ReceiveSelectors.AssetItem, others: [SharedSelectors.BackButton] },
    actions: [],
    specs: [],
    description:
      'The first screen of the receive sheet (features/receive/screens/select-asset.tsx, header t`Select asset` / t`Receive`). It lists the current account addresses (native segwit and taproot Bitcoin, Stacks; get-assets.ts) filtered by the receive type the opener passed; every row shares the receiveAssetItem test id and has a t`Copy address` button. When the filter leaves a single asset the screen jumps straight to its details. No spec covers it.',
  },
  {
    id: 'receive-asset-details',
    anchor: { kind: 'selectors', objects: ['ReceiveSelectors.AssetDetails'] },
    routes: [],
    startRoute: AppRoutes.Home,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open the receive sheet and tap an asset (ReceiveSelectors.AssetItem)',
          'Or tap "Receive" on a Stacks token details screen, which opens the sheet with a single asset',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ReceiveSelectors.AssetDetails,
      others: [ReceiveSelectors.CopyAddressButton, ReceiveSelectors.ShareButton],
    },
    actions: [],
    specs: [],
    description:
      'The receive address screen (features/receive/screens/asset-details.tsx, title t`Receive`, subtitle the account name): a QR code of the address, the asset name with its address type badge, the address (tap to copy) and a t`Share` button that opens the system share sheet. The back button only shows when it was reached from the asset list. No spec covers it.',
  },
] as const satisfies readonly MobileFeatureEntry[];
