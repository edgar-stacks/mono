import { AppRoutes } from '@/shared/app-routes';
import { ReceiveSelectors } from '@/shared/selectors/receive.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

export const receiveFeatures = [
  {
    id: 'receive-select-asset',
    anchor: { kind: 'selectors', objects: ['ReceiveSelectors.AssetItem'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: ['On home tap "Receive"'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: ReceiveSelectors.AssetItem, others: [] },
    actions: [],
    specs: [],
    description:
      'Receive asset list (features/receive/screens/select-asset.tsx) in the global receive sheet: t`Select asset` with the t`Receive` subtitle and one row per address (Bitcoin native segwit, Bitcoin taproot, Stacks) with a copy shortcut. When the receive type matches a single asset, for example from a token details screen, it skips straight to receive-asset-details.',
  },
  {
    id: 'receive-asset-details',
    anchor: { kind: 'selectors', objects: ['ReceiveSelectors.CopyAddressButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      { kind: 'nav', steps: ['On home tap "Receive"', 'Tap an asset row'] },
      { kind: 'nav', steps: ['On a token details screen tap "Receive"'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ReceiveSelectors.CopyAddressButton,
      others: [ReceiveSelectors.ShareButton],
    },
    actions: [],
    specs: [],
    description:
      'Receive address (features/receive/screens/asset-details.tsx): t`Receive` with the account name, a QR code of the address, the asset name with its address type badge and description, the address row that copies it and a t`Share` button. The back button shows only when reached from the asset list.',
  },
] as const satisfies readonly MobileFeatureEntry[];
