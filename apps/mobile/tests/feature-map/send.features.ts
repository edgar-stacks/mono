import { AppRoutes } from '@/shared/app-routes';
import { SendSelectors } from '@/shared/selectors/send.selectors';

import type { MobileFeatureEntry } from './mobile-feature-entry';

const recipientSuggestionsSpec =
  'apps/mobile/src/features/send/components/recipient/build-recipient-suggestions.spec.ts';
const openSendFromHome = 'On Home tap "Send" in the account action buttons';
const openSendFromToken = 'On a token details screen tap "Send"';

export const sendFeatures = [
  {
    id: 'send-select-asset',
    anchor: { kind: 'selectors', objects: ['SendSelectors.AssetPickerItem'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: [openSendFromHome] }],
    gate: 'splashScreen',
    flags: ['release_sip10_send_feature'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SendSelectors.AssetPickerItem, others: [] },
    actions: [],
    specs: [],
    description:
      "First screen of the full-height send sheet (apps/mobile/src/features/send/screens/select-asset.tsx), titled t`Select asset` with the subtitle t`Send`. Lists the current account's Bitcoin and Stacks balances and, when release_sip10_send_feature is on, its SIP-10 tokens (components/asset-picker/asset-picker.tsx); every row carries SendSelectors.AssetPickerItem. Tapping a row opens the send form for that asset. Opening Send from a token details screen skips this step.",
  },
  {
    id: 'send-inline-asset-picker',
    anchor: { kind: 'selectors', objects: ['SendSelectors.AssetDisplay'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSendFromHome, 'Pick an asset', 'Tap the asset row at the top of the form'],
      },
    ],
    gate: 'splashScreen',
    flags: ['release_sip10_send_feature'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SendSelectors.AssetPickerItem, others: [SendSelectors.AssetDisplay] },
    actions: [],
    specs: [],
    description:
      'Bottom sheet over the send form (apps/mobile/src/features/send/components/inline-asset-picker.tsx) opened by tapping the asset row (SendSelectors.AssetDisplay). It reuses the asset picker list; choosing a row switches the form to that asset and closes the sheet.',
  },
  {
    id: 'send-form-btc',
    anchor: { kind: 'selectors', objects: ['SendSelectors.AmountField'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: [openSendFromHome, 'Tap the Bitcoin row'] }],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.AmountField,
      others: [
        SendSelectors.AssetDisplay,
        SendSelectors.RecipientToggle,
        SendSelectors.RecipientQrButton,
        SendSelectors.Numpad,
        SendSelectors.ReviewButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Bitcoin send form (apps/mobile/src/features/send/forms/btc/btc-form.tsx) inside the sheet titled t`Send` with the account name as subtitle. Shows the t`Bitcoin` asset row with its available balance, the amount field with a send-max control, the recipient toggle (t`Enter recipient` with a t`Scan a QR code` button), a numpad and the t`Review` button, enabled once the form is valid. Fee rates and UTXOs load first (btc-loader.tsx). Review signs a PSBT and opens the send approver.',
  },
  {
    id: 'send-form-stx',
    anchor: { kind: 'selectors', objects: ['SendSelectors.MemoToggle'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      { kind: 'nav', steps: [openSendFromHome, 'Tap the Stacks row'] },
      { kind: 'nav', steps: ['Open the STX token details', openSendFromToken] },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.AmountField,
      others: [
        SendSelectors.AssetDisplay,
        SendSelectors.RecipientToggle,
        SendSelectors.MemoToggle,
        SendSelectors.Numpad,
        SendSelectors.ReviewButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'STX send form (apps/mobile/src/features/send/forms/stx/stx-form.tsx): asset row, amount field, recipient toggle, the t`Add memo` / t`Edit memo` toggle, numpad and t`Review`. Balances, market data and the nonce load first (stx-loader.tsx). Review builds an unsigned transaction and opens the send approver.',
  },
  {
    id: 'send-form-sip10',
    anchor: { kind: 'selectors', objects: ['SendSelectors.ReviewButton'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [{ kind: 'nav', steps: [openSendFromHome, 'Tap a SIP-10 token row'] }],
    gate: 'splashScreen',
    flags: ['release_sip10_send_feature'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.AmountField,
      others: [
        SendSelectors.AssetDisplay,
        SendSelectors.RecipientToggle,
        SendSelectors.MemoToggle,
        SendSelectors.Numpad,
        SendSelectors.ReviewButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'SIP-10 token send form (apps/mobile/src/features/send/forms/stx/sip10-form.tsx), the same layout as the STX form for a fungible Stacks token. The token only appears in the asset picker when release_sip10_send_feature is on and the account holds it.',
  },
  {
    id: 'send-recipient',
    anchor: { kind: 'selectors', objects: ['SendSelectors.RecipientSearch'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSendFromHome, 'Pick an asset', 'Tap t`Enter recipient` on the form'],
      },
    ],
    gate: 'splashScreen',
    flags: ['send_paste_button'],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.RecipientSearch,
      others: [SendSelectors.RecipientSearchQrButton],
    },
    actions: [],
    specs: [recipientSuggestionsSpec],
    description:
      'Recipient sheet (apps/mobile/src/features/send/components/recipient/recipient-sheet.tsx, recipient-selector/recipient-selector.tsx) with a t`Search for BNS name or address` search field, a t`Scan a QR code` button and, when send_paste_button is on, an iOS paste button. Below it lists suggestions from recent activity and own accounts (build-recipient-suggestions.ts), or a BNS lookup result while searching. Selecting an address runs the recipient guard.',
  },
  {
    id: 'send-recipient-qr-scanner',
    anchor: { kind: 'selectors', objects: ['SendSelectors.QrScanner'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          openSendFromHome,
          'Pick an asset',
          'Tap t`Scan a QR code` on the recipient toggle or in the recipient sheet',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SendSelectors.QrScanner, others: [] },
    actions: [],
    specs: [],
    description:
      'Full-screen camera sheet (apps/mobile/src/features/send/components/recipient/recipient-qr-sheet.tsx, features/qr-scanner/qr-scanner.tsx). Accepts a Bitcoin or Stacks address or a BIP-21 URI; anything else flashes t`Scan a Bitcoin or Stacks address`. Needs camera permission, so it cannot run on a simulator without one.',
  },
  {
    id: 'send-recipient-guard',
    anchor: { kind: 'selectors', objects: ['SendSelectors.RecipientGuardAddress'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          openSendFromHome,
          'Pick an asset',
          'Choose or scan a recipient the evaluator warns about or blocks',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.RecipientGuardAddress,
      others: [
        SendSelectors.RecipientGuardConfirmButton,
        SendSelectors.RecipientGuardCancelButton,
        SendSelectors.RecipientGuardDismissButton,
      ],
    },
    actions: [],
    specs: [],
    description:
      'Recipient guard sheet (apps/mobile/src/features/send/components/recipient/recipient-guard-sheet.tsx) presented when use-recipient-evaluator.ts returns a warn or block result: the title and description from the evaluator and the address. A warning offers t`Confirm` and t`Cancel` (confirm and cancel buttons); a block only t`Dismiss`.',
  },
  {
    id: 'send-memo',
    anchor: { kind: 'selectors', objects: ['SendSelectors.MemoInput'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [openSendFromHome, 'Tap the Stacks row or a SIP-10 token', 'Tap t`Add memo`'],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: {
      ready: SendSelectors.MemoInput,
      others: [SendSelectors.MemoConfirmButton],
    },
    actions: [],
    specs: [],
    description:
      'Memo sheet (apps/mobile/src/features/send/components/memo.tsx) titled t`Add memo` with a t`Memo` input and t`Confirm`. An invalid memo shows the validation message after the first confirm and marks the form toggle red. Only the STX and SIP-10 forms render it.',
  },
  {
    id: 'send-approver-btc',
    anchor: { kind: 'selectors', objects: ['SendSelectors.Approver'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          openSendFromHome,
          'Tap the Bitcoin row',
          'Enter an amount and a recipient',
          'Tap t`Review`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SendSelectors.Approver, others: [] },
    actions: [],
    specs: [],
    description:
      'Bitcoin review step of the send sheet (apps/mobile/src/features/send/screens/approver.tsx) rendering PsbtSigner (features/psbt-signer/psbt-signer.tsx) with the fee editor on and broadcast enabled: outcome, inputs and outputs, fee and the approve button. Approving signs and broadcasts; the back action returns to the form. Not deep-linkable: it needs the PSBT the form builds.',
  },
  {
    id: 'send-approver-stacks',
    anchor: { kind: 'selectors', objects: ['SendSelectors.Approver'] },
    routes: [],
    startRoute: AppRoutes.Home,
    open: [],
    params: [],
    entry: [
      {
        kind: 'nav',
        steps: [
          openSendFromHome,
          'Tap the Stacks row or a SIP-10 token',
          'Enter an amount and a recipient',
          'Tap t`Review`',
        ],
      },
    ],
    gate: 'splashScreen',
    flags: [],
    preconditions: { session: 'signed-in', accountType: 'software', mocks: [] },
    selectors: { ready: SendSelectors.Approver, others: [] },
    actions: [],
    specs: [],
    description:
      'Stacks review step of the send sheet (apps/mobile/src/features/send/forms/stx/stx-approver.tsx and sip10-approver.tsx) on the shared Stacks transaction approver layout: outcome, fee, nonce and memo. Approving signs and broadcasts, then shows the t`Transaction is sent!` toast; a broadcast error shows its message as an error toast.',
  },
] as const satisfies readonly MobileFeatureEntry[];
