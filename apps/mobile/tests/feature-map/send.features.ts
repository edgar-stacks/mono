import { AppRoutes } from '@/shared/app-routes';
import { SendSelectors } from '@/shared/selectors/send.selectors';
import { SharedSelectors } from '@/shared/selectors/shared.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const recipientSuggestionsSpec =
  'apps/mobile/src/features/send/components/recipient/build-recipient-suggestions.spec.ts';
const openSendFromHome =
  'On Home with a wallet, tap the "Send" action button (t`Send` in components/action-buttons.tsx), or tap "Send" on a token details screen to skip the asset picker';

export const sendFeatures = [
  {
    id: 'send-select-asset',
    anchor: { kind: 'selectors', objects: ['SendSelectors.AssetPickerItem'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [{ kind: 'nav', steps: [openSendFromHome] }],
    gate: 'splashScreen',
    flags: ['release_sip10_send_feature'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.AssetPickerItem, others: [] },
    actions: [],
    specs: [],
    description:
      'The first screen of the send sheet (features/send/screens/select-asset.tsx, header t`Select asset` / t`Send`), shown only when the sheet opens without an asset (send/navigation.tsx). It lists BTC and STX balances of the current account and, when release_sip10_send_feature is on, its SIP-10 tokens (components/asset-picker/asset-picker.tsx); every row shares the sendAssetPickerItem test id. Tapping a row opens the form for that protocol. No spec covers it.',
  },
  {
    id: 'send-btc-form',
    anchor: { kind: 'selectors', objects: ['SendSelectors.BtcForm'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSendFromHome, 'Pick Bitcoin (SendSelectors.AssetPickerItem)'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SendSelectors.BtcForm,
      others: [
        SendSelectors.RecipientToggle,
        SendSelectors.ReviewButton,
        SharedSelectors.BackButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'The Bitcoin send form (features/send/forms/btc/btc-form.tsx) behind BtcDataLoader, which shows a spinner until balance, UTXOs, fee rates and market data load and an error with retry if any fail. It has the asset display (tap to open the inline asset picker), the amount field with send-max, the recipient toggle, a numpad and t`Review`, enabled once the form is valid; Review builds a PSBT and navigates to the approver. No spec covers it.',
  },
  {
    id: 'send-stx-form',
    anchor: { kind: 'selectors', objects: ['SendSelectors.StxForm'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      { kind: 'nav', steps: [openSendFromHome, 'Pick Stacks (SendSelectors.AssetPickerItem)'] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SendSelectors.StxForm,
      others: [SendSelectors.RecipientToggle, SendSelectors.ReviewButton],
    },
    actions: [],
    specs: [],
    description:
      'The STX send form (features/send/forms/stx/stx-form.tsx) behind StxDataLoader (balance, market data and nonce). Like the Bitcoin form it has the asset display, amount, recipient, numpad and t`Review`, plus a memo field (components/memo.tsx); Review signs an unsigned transaction and opens the approver. No spec covers it.',
  },
  {
    id: 'send-sip10-form',
    anchor: { kind: 'selectors', objects: ['SendSelectors.Sip10Form'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSendFromHome, 'Pick a SIP-10 token row (SendSelectors.AssetPickerItem)'],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_sip10_send_feature'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: {
      ready: SendSelectors.Sip10Form,
      others: [SendSelectors.RecipientToggle, SendSelectors.ReviewButton],
    },
    actions: [],
    specs: [],
    description:
      'The SIP-10 token send form (features/send/forms/stx/sip10-form.tsx) behind Sip10DataLoader. It mirrors the STX form with the token name from the asset and a memo field. The token rows only appear in the asset picker when release_sip10_send_feature is on; a token details screen can still open the sheet with the asset preselected. No spec covers it.',
  },
  {
    id: 'send-recipient-selector',
    anchor: { kind: 'selectors', objects: ['SendSelectors.RecipientSearch'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open any send form (send-btc-form, send-stx-form or send-sip10-form)',
          'Tap t`Enter recipient` (SendSelectors.RecipientToggle)',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: ['send_paste_button'],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.RecipientSearch, others: [] },
    actions: [],
    specs: [recipientSuggestionsSpec],
    description:
      'The recipient sheet (components/recipient/recipient-sheet.tsx and recipient-selector/recipient-selector.tsx): a search input t`Search for BNS name or address` with a QR button and, on iOS when send_paste_button is on, a paste button. Below it are suggestions built from the current wallet accounts and recent activity (build-recipient-suggestions.ts), BNS lookup results while searching, or an empty state. Picking an address runs the recipient guard before filling the form.',
  },
  {
    id: 'send-recipient-qr-scanner',
    anchor: { kind: 'selectors', objects: ['SendSelectors.QrScanner'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open any send form',
          'Tap t`Scan a QR code` on the recipient toggle or in the recipient sheet',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.QrScanner, others: [] },
    actions: [],
    specs: [],
    description:
      'The camera QR scanner (features/qr-scanner/qr-scanner.tsx, title t`Scan QR Code`) in its own sheet, asking for camera permission first (use-camera-permission.ts). recipient-qr-scanner.tsx accepts a Bitcoin or Stacks address or a BIP-21 URI and otherwise shows t`Scan a Bitcoin or Stacks address`. It needs a device camera, so a simulator only shows the permission state. No spec covers it.',
  },
  {
    id: 'send-recipient-guard',
    anchor: { kind: 'selectors', objects: ['SendSelectors.RecipientGuardAddress'] },
    routes: [],
    startRoute: AppRoutes.Home,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          'Open the recipient sheet of a send form',
          'Pick or enter an address the recipient evaluator flags, for example one never sent to before or one on another network',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.RecipientGuardAddress, others: [] },
    actions: [],
    specs: [],
    description:
      'The recipient guard sheet (components/recipient/recipient-guard-sheet.tsx) that opens when use-recipient-evaluator.ts returns a warn or block severity. It shows a title, a description and the address; warn offers a confirm and t`Cancel`, block only t`Dismiss`. No spec covers it.',
  },
  {
    id: 'send-btc-approver',
    anchor: { kind: 'selectors', objects: ['SendSelectors.Approver'] },
    routes: [],
    startRoute: AppRoutes.Home,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Fill the Bitcoin send form', 'Tap t`Review` (SendSelectors.ReviewButton)'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.Approver, others: [] },
    actions: [],
    specs: [],
    description:
      'The approver step of the send sheet (features/send/screens/approver.tsx) for Bitcoin: it renders PsbtSigner (features/psbt-signer/psbt-signer.tsx) with the fee editor enabled and broadcast on, using the PSBT hex the form passed as a navigation param. Going back returns to the form; closing dismisses the send sheet. No spec covers it.',
  },
  {
    id: 'send-stx-approver',
    anchor: { kind: 'selectors', objects: ['SendSelectors.Approver'] },
    routes: [],
    startRoute: AppRoutes.Home,
    deepLinkable: false,
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: ['Fill the STX or SIP-10 send form', 'Tap t`Review` (SendSelectors.ReviewButton)'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', mocks: [] },
    selectors: { ready: SendSelectors.Approver, others: [] },
    actions: [],
    specs: [],
    description:
      'The approver step of the send sheet for Stacks: StxApprover (forms/stx/stx-approver.tsx) for STX and Sip10Approver (forms/stx/sip10-approver.tsx) for SIP-10 tokens, both built on the shared Stacks approver sections. Approving signs and broadcasts the transaction, shows the toast t`Transaction is sent!` and dismisses the sheet; editing returns to the form. No spec covers it.',
  },
] as const satisfies readonly MobileFeatureEntry[];
