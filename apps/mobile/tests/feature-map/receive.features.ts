import { AppRoutes } from '@/shared/app-routes';
import { ReceiveSelectors } from '@/shared/selectors/receive.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

export const receiveFeatures = [
  {
    id: 'receive-select-asset',
    anchor: { kind: 'selectors', objects: ['ReceiveSelectors.SelectAssetScreen'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: ['On Home tap "Receive" (SharedSelectors.ReceiveButton)'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: ReceiveSelectors.SelectAssetScreen,
      others: [
        ReceiveSelectors.AssetItem,
        SharedSelectors.BackButton,
        SharedSelectors.ReceiveButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'First step of the global receive sheet (receive-sheet.tsx): "Select asset" with the subtitle "Receive" (receive/screens/select-asset.tsx). Rows "Native Segwit", "Taproot" and "Stacks" (ReceiveSelectors.AssetItem on every row) open the QR step; "Copy address" copies directly with the "Address copied" toast.',
  },
  {
    id: 'receive-asset-details',
    anchor: { kind: 'selectors', objects: ['ReceiveSelectors.AssetDetailsScreen'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'On Home tap "Receive" and pick an asset',
          'Or tap "Receive" on a token screen or "Receive Stacks NFT" on the empty Collectibles tab, which open this step directly',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: ReceiveSelectors.AssetDetailsScreen, others: [SharedSelectors.BackButton] },
    actions: [],
    specs: [],
    description:
      '"Receive" QR step (receive/screens/asset-details.tsx) with the address QR code, the address, "Share" and a description such as "This is your Native Segwit address for receiving tokens on the Bitcoin network." (get-assets.ts). It reads the asset and account name from the sheet navigator.',
  },
] as const satisfies readonly MobileFeatureEntry[];
