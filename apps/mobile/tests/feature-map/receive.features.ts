import { AppRoutes } from '@/shared/app-routes';
import { ReceiveSelectors } from '@/shared/selectors/receive.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const unlock = 'apps/mobile/maestro/shared/unlock.yaml';
const openReceiveSheetStep =
  'On the home screen tap "Receive" in the account actions row (it renders only when a wallet exists)';

export const receiveFeatures = [
  {
    id: 'receive-select-asset',
    anchor: { kind: 'selectors', objects: ['ReceiveSelectors.AssetItem'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [{ kind: 'nav', steps: [openReceiveSheetStep] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ReceiveSelectors.AssetItem,
      others: [ReceiveSelectors.AssetItemCopyButton],
    },
    actions: [],
    specs: [],
    description:
      'Full-height receive sheet headed "Select asset" with the subtitle "Receive". From home it lists three rows: "Bitcoin" with the "Native Segwit" badge, "Bitcoin" with the "Taproot" badge and "Stacks", each with a truncated address and a "Copy address" button. Tapping a row opens the asset details; opened from a token screen with a single matching address, the sheet skips straight to the details.',
  },
  {
    id: 'receive-asset-details',
    anchor: { kind: 'selectors', objects: ['ReceiveSelectors.QrCard'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [unlock],
    params: [],
    entry: [
      { kind: 'nav', steps: [openReceiveSheetStep, 'Tap the "Stacks" row'] },
      {
        kind: 'nav',
        steps: ['Open the Stacks asset from the home screen', 'Tap "Receive" on the token screen'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: ReceiveSelectors.QrCard,
      others: [ReceiveSelectors.CopyAddressButton, ReceiveSelectors.ShareButton],
    },
    actions: [],
    specs: [],
    description:
      'Receive details headed "Receive" with the account name as subtitle: a QR card of the address, the asset name with its address type badge, a description such as "This is your address for receiving tokens on the Stacks network.", the full address (tapping it copies) and "Share", which opens the system share sheet. The header back button (`backButton`) shows only when the screen was reached from "Select asset".',
  },
] as const satisfies readonly MobileFeatureEntry[];
